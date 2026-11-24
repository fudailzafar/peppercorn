import { goBack } from '../lib/nav';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Animated, BackHandler, Easing, Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { Icon } from '../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Reanimated, { Easing as ReEasing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AppText } from '../components/AppText';
import { BigAmount } from '../components/Bits';
import { useDeleteFlow } from '../components/DeleteFlow';
import { useDateTimePicker } from '../components/DateTimeField';
import { EnterSlide } from '../components/EnterSlide';
import { AssistChip, BottomSheet, Button, ChoiceCard, EmojiAvatar, FilterChip, IconButton, PillField, SegmentedButton } from '../components/material';
import { NumberPad } from '../components/NumberPad';
import { Popover, PopoverItem, useAnchor, anchorProps } from '../components/Overlays';
import { assetById, assetCategoryId, fundQuote, latestQuote, metalQuote } from '../lib/assets';
import { display, fromNumber, toNumber, type EntryType } from '../lib/amount';
import { dayLabel, isSameDay, shortDate, time24 } from '../lib/dates';
import { Haptics } from '../lib/haptics';
import { currencySymbol, fmtFull } from '../lib/format';
import { useKeyboardLift } from '../lib/useKeyboardLift';
import { refreshPrices } from '../lib/prices';
import { useStore, useUi } from '../lib/store';
import { useNow } from '../lib/useNow';
import type { AssetId, Category, RecurringType } from '../lib/types';
import { springs } from '../theme/motion';
import { m3Duration, m3Easing, shape } from '../theme/material';
import { useTheme } from '../theme/theme';

const REPEAT_LABELS: Record<RecurringType, string> = { 0: 'Don’t repeat', 1: 'Daily', 2: 'Weekly', 3: 'Monthly' };
const UNIT: Record<1 | 2 | 3, string> = { 1: 'day', 2: 'week', 3: 'month' };

/** Add or edit an entry (full-screen, slides up). `income=1` opens it on Income, `asset=gold` on that asset. */
export default function TransactionScreen() {
  const { id, income: startIncome, asset: startAsset } = useLocalSearchParams<{ id?: string; income?: string; asset?: AssetId }>();
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const existing = useStore((s) => s.transactions.find((t) => t.id === id));
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const showToast = useUi((s) => s.showToast);
  const prices = useStore((s) => s.prices);

  const [income, setIncome] = useState(existing?.income ?? startIncome === '1');
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState(() => (existing ? new Date(existing.date) : new Date()));
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? (startAsset ? assetCategoryId(startAsset) : null));
  const category = categories.find((x) => x.id === categoryId);
  // Gold and silver are entered in grams; their cost comes from the day's price.
  const asset = category?.asset ? assetById(category.asset) : null;
  const metal = asset?.kind === 'metal';
  const entryType = (metal ? 2 : settings.numberEntryType) as EntryType;
  const decimals = metal ? 3 : 2;
  const [raw, setRaw] = useState(() => (existing ? fromNumber(metal ? (existing.qty ?? 0) : existing.amount, entryType, decimals) : ''));
  const [repeat, setRepeat] = useState<RecurringType>(existing?.recurringType ?? 0);
  const [every, setEvery] = useState(existing?.recurringCoefficient || 1);
  const [pickingCategory, setPickingCategory] = useState(false);
  const [noteFocused, setNoteFocused] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  // Fixed on open, so deleting the entry doesn't turn this into the add screen while it slides away.
  const [editing] = useState(() => existing !== undefined);
  const now = useNow();
  const { onLayout: onRootLayout, lift } = useKeyboardLift();
  const { remove } = useDeleteFlow();
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const repeatMenu = useAnchor();
  const datePicker = useDateTimePicker(date, setDate);

  // Asset prices are in rupees, so assets are only offered with rupees.
  const typeCategories = useMemo(
    () => categories.filter((x) => x.income === income && (!x.asset || settings.currency === 'INR')).sort((a, b) => a.order - b.order),
    [categories, income, settings.currency],
  );
  const pickCategory = (next: string | null) => {
    const nextAsset = categories.find((x) => x.id === next)?.asset;
    // Grams and rupees aren't the same number: start over when switching between them.
    if ((nextAsset ? assetById(nextAsset).kind === 'metal' : false) !== metal) setRaw('');
    setCategoryId(next);
  };

  const suggestions = useMemo(() => {
    const q = note.trim().toLowerCase();
    if (!noteFocused || q.length === 0) return [];
    const seen = new Set<string>();
    return transactions
      .filter((t) => t.income === income && !t.asset && t.note.toLowerCase().includes(q) && t.note.toLowerCase() !== q)
      .sort((a, b) => b.date - a.date)
      .filter((t) => (seen.has(t.note) ? false : (seen.add(t.note), true)))
      .slice(0, 3);
  }, [note, noteFocused, transactions, income]);

  const typed = toNumber(raw, entryType);
  // Keep the price an entry was bought at unless its day (or asset) changes.
  const sameDay = existing !== undefined && existing.asset === asset?.id && isSameDay(existing.date, date);
  const keptRate = sameDay ? existing.rate : undefined;
  const quote = asset && metal ? metalQuote(prices[asset.id], date) : null;
  const rate = keptRate ?? quote?.rate;
  const amount = metal ? Math.round(typed * (rate ?? 0) * 100) / 100 : typed;
  const latest = asset ? latestQuote(prices[asset.id]) : null;
  const rupee = currencySymbol('INR');
  const assetHint = !asset
    ? ''
    : metal
      ? rate === undefined
        ? 'Getting today’s price…'
        : `${typed > 0 ? `${rupee}${fmtFull(amount)} at ` : ''}${rupee}${fmtFull(rate)} a gram${quote && keptRate === undefined ? `, ${shortDate(new Date(`${quote.day}T00:00`))}` : ''}`
      : latest
        ? `Latest price ${rupee}${fmtFull(latest.rate)} a unit, ${shortDate(new Date(`${latest.day}T00:00`))}`
        : 'Getting the latest price…';
  // Picking an asset makes sure its daily price is there.
  const assetId = asset?.id;
  const hasPrice = latest !== null;
  useEffect(() => {
    if (assetId && !hasPrice) void refreshPrices(true);
  }, [assetId, hasPrice]);

  // The screen slides up from the bottom on open and back down on close (the same on iOS, Android and web).
  // It can also be dragged down to dismiss, like an iOS sheet; the drag follows the finger on the UI thread.
  const { height: screenHeight } = useWindowDimensions();
  const sheetY = useSharedValue(screenHeight);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    sheetY.set(withTiming(0, { duration: m3Duration.long2 - 100, easing: ReEasing.bezier(...m3Easing.emphasizedDecelerate) }));
  }, [sheetY]);
  const finishClose = useCallback(() => goBack(), []);
  const markClosing = useCallback(() => {
    setClosing(true);
    Keyboard.dismiss();
  }, []);
  const hideKeyboard = useCallback(() => Keyboard.dismiss(), []);
  const close = () => {
    if (closing) return;
    markClosing();
    sheetY.set(
      withTiming(screenHeight, { duration: 250, easing: ReEasing.bezier(...m3Easing.emphasizedAccelerate) }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(finishClose);
      }),
    );
  };
  useEffect(() => {
    // Android's back button should slide the sheet down too.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  });

  const dragDown = usePanGesture({
    // Only a downward, mostly vertical drag starts it. The category grid scrolls, so dragging is off while it is open.
    enabled: !pickingCategory && !closing,
    activeOffsetY: [-1000, 14],
    failOffsetX: [-24, 24],
    onActivate: () => {
      'worklet';
      scheduleOnRN(hideKeyboard);
    },
    onUpdate: (e) => {
      'worklet';
      sheetY.set(Math.max(0, e.translationY));
    },
    onDeactivate: (e) => {
      'worklet';
      if (e.translationY > 110 || e.velocityY > 900) {
        scheduleOnRN(markClosing);
        sheetY.set(
          withTiming(screenHeight, { duration: 200, easing: ReEasing.bezier(...m3Easing.emphasizedAccelerate) }, (finished) => {
            'worklet';
            if (finished) scheduleOnRN(finishClose);
          }),
        );
      } else {
        sheetY.set(withSpring(0, springs.smooth));
      }
    },
  });
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.get() }] }));

  // Dime flashes the category pill red and shakes it when the category is missing.
  const noteRef = useRef<ComponentRef<typeof TextInput>>(null);
  // Closing the keyboard (back gesture, or its check key) also leaves the note field, so the number pad returns.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => noteRef.current?.blur());
    return () => sub.remove();
  }, []);
  const [flash] = useState(() => new Animated.Value(0));
  const [shake] = useState(() => new Animated.Value(0));
  const flashCategory = () => {
    flash.stopAnimation();
    shake.setValue(0);
    Animated.timing(flash, { toValue: 1, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: false }).start();
    Animated.sequence(
      [-6, 6, -6, 6, -6, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 100, easing: Easing.inOut(Easing.ease), useNativeDriver: true })),
    ).start();
    setTimeout(() => {
      Animated.timing(flash, { toValue: 0, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: false }).start();
    }, 500);
  };

  // What an asset purchase stores: grams (or units) and the price. A fund's units wait for its day's closing price.
  const assetFields = () => {
    if (!asset) return {};
    if (metal) return { asset: asset.id, qty: typed, rate };
    const nav = keptRate ?? fundQuote(prices[asset.id], date)?.rate;
    return { asset: asset.id, qty: nav ? typed / nav : undefined, rate: nav };
  };

  const submit = () => {
    if (metal && typed > 0 && rate === undefined) {
      Haptics.error();
      showToast({ title: 'Couldn’t get the price. Check your connection and try again.', icon: 'alert-circle', tone: 'error' }, 3000);
      void refreshPrices(true);
      return;
    }
    if (typed <= 0 && !categoryId) {
      Haptics.error();
      showToast({ title: 'Enter an amount and choose a category', icon: 'help-circle-outline', tone: 'error' }, 2000);
      flashCategory();
      return;
    }
    if (typed <= 0) {
      Haptics.error();
      showToast({ title: metal ? 'Enter the grams' : 'Enter an amount', icon: 'cash-outline', tone: 'error' }, 2000);
      return;
    }
    if (!categoryId) {
      Haptics.error();
      showToast({ title: 'Choose a category', icon: 'file-tray-outline', tone: 'error' }, 2000);
      flashCategory();
      return;
    }
    const input = { amount, date: date.getTime(), note, income, categoryId, recurringType: repeat, recurringCoefficient: repeat > 0 ? every : 0, ...assetFields() };
    if (existing) {
      updateTransaction(existing.id, input);
      showToast({ title: 'Changes saved', icon: 'checkmark-circle', tone: 'success' }, 2000);
    } else {
      const saved = addTransaction(input);
      showToast(
        {
          title: asset ? `${asset.name} saved` : income ? 'Income saved' : 'Expense saved',
          icon: 'checkmark-circle',
          tone: 'success',
          // A repeating entry may have logged past dates too, so it can't be undone as one.
          onTap: repeat > 0 ? undefined : () => deleteTransaction(saved.id),
        },
        3000,
      );
    }
    // Fetches an older day's price if this purchase needs one.
    if (asset && !metal) void refreshPrices(true);
    Haptics.success();
    close();
  };

  const switchType = (next: boolean) => {
    if (next === income) return;
    Haptics.selection();
    setIncome(next);
    pickCategory(null);
  };

  const todayish = isSameDay(date, now);
  const dateText = todayish ? `Today, ${date.getDate()} ${dayLabel(date).split(' ')[2]}` : dayLabel(date);

  return (
    <GestureDetector gesture={dragDown}>
    <Reanimated.View onLayout={onRootLayout} style={[{ flex: 1, backgroundColor: m3.surface, paddingTop: insets.top, paddingBottom: lift }, sheetStyle]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <IconButton icon="close" onPress={close} label="Close" />

        {settings.incomeTracking ? (
          <SegmentedButton options={['Expense', 'Income']} index={income ? 1 : 0} onChange={(i) => switchType(i === 1)} />
        ) : (
          <View />
        )}

        {editing ? (
          <IconButton
            icon="trash-outline"
            onPress={() => {
              if (existing) remove(existing);
              close();
            }}
            label="Delete entry"
          />
        ) : (
          <View {...anchorProps(repeatMenu)}>
            <IconButton icon="repeat" onPress={repeatMenu.open} label="Repeat" tint={repeat > 0 ? m3.primary : undefined} />
          </View>
        )}
      </View>

      <Popover visible={repeatMenu.visible} anchor={repeatMenu.anchor} onClose={repeatMenu.close} align="right" width={190}>
        {([0, 1, 2, 3] as RecurringType[]).map((r) => (
          <PopoverItem
            key={r}
            label={REPEAT_LABELS[r]}
            selected={repeat === r && !(r > 0 && every > 1)}
            onPress={() => {
              repeatMenu.close();
              setRepeat(r);
              setEvery(1);
            }}
          />
        ))}
        <PopoverItem
          label="Custom"
          selected={repeat > 0 && every > 1}
          onPress={() => {
            repeatMenu.close();
            setCustomOpen(true);
          }}
        />
      </Popover>

      {/* Amount and note */}
      <Pressable accessible={false} style={styles.middle} onPress={() => { noteRef.current?.blur(); Keyboard.dismiss(); }}>
        <View style={{ alignSelf: 'stretch', paddingHorizontal: 56, alignItems: 'center' }}>
          <BigAmount value={display(raw, entryType)} currency={settings.currency} suffix={metal ? 'g' : undefined} size={57} income={income && amount > 0} />
          {/* Backspace sits beside the amount (the keypad itself is just digits, the point and the check). */}
          {entryType === 2 && raw.length > 0 ? (
            <View style={styles.backspace}>
              <IconButton icon="backspace-outline" onPress={() => setRaw(raw.slice(0, -1))} label="Delete digit" />
            </View>
          ) : null}
        </View>

        {assetHint ? (
          <AppText variant="bodyMedium" color={m3.onSurfaceVariant} style={{ marginTop: 4, textAlign: 'center' }}>
            {assetHint}
          </AppText>
        ) : null}
        <View style={{ marginTop: 24, paddingHorizontal: 16, alignSelf: 'stretch' }}>
          <PillField
            placeholder="Add a note"
            icon="create-outline"
            inputRef={noteRef}
            value={note}
            onChangeText={setNote}
            onFocus={() => {
              setNoteFocused(true);
              setPickingCategory(false);
            }}
            onBlur={() => setNoteFocused(false)}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            maxLength={60}
          />
        </View>

        {repeat > 0 || editing ? (
          <View {...(editing ? anchorProps(repeatMenu) : {})}>
            <AssistChip
              icon="repeat"
              label={repeat === 0 ? 'Doesn’t repeat' : every === 1 ? `Repeats ${REPEAT_LABELS[repeat].toLowerCase()}` : `Every ${every} ${UNIT[repeat as 1 | 2 | 3]}s`}
              onPress={repeatMenu.open}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : null}

        {suggestions.length > 0 ? (
          <View style={{ marginTop: 14, gap: 8, alignItems: 'center' }}>
            {suggestions.map((s) => (
              <AssistChip
                key={s.id}
                label={s.note}
                onPress={() => {
                  setNote(s.note);
                  pickCategory(s.categoryId);
                  if (raw === '') setRaw(fromNumber(s.amount, entryType));
                  Keyboard.dismiss();
                }}
              />
            ))}
          </View>
        ) : null}
      </Pressable>

      {/* Bottom: date, category and the pad */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}>
        {/* Category quick-pick: one tap on a chip instead of opening the full grid. */}
        {!pickingCategory && !noteFocused && typeCategories.length > 0 ? (
          <CategoryChips
            categories={typeCategories}
            selectedId={categoryId}
            onPick={(cat) => {
              Haptics.selection();
              pickCategory(cat.id === categoryId ? null : cat.id);
            }}
          />
        ) : null}
        <View style={styles.pillRow}>
          <Button variant="outlined" icon="calendar-outline" label={`${dateText}  ${time24(date)}`} onPress={datePicker.open} accessibilityLabel="Change date" style={{ flex: 1 }} />

          {pickingCategory ? (
            <Button variant="outlined" label="Close" icon="close" onPress={() => setPickingCategory(false)} style={{ minWidth: 120 }} />
          ) : (
            <Animated.View style={{ minWidth: 120, maxWidth: 176, flexShrink: 0, transform: [{ translateX: shake }] }}>
              <Button
                variant={category ? 'tonal' : 'outlined'}
                accessibilityLabel="Choose category"
                icon={category ? undefined : 'apps-outline'}
                leading={category ? <AppText size={16}>{category.emoji}</AppText> : undefined}
                label={category ? shortName(category) : 'Category'}
                onPress={() => {
                  Keyboard.dismiss();
                  setPickingCategory(true);
                }}
              />
              {/* Error state that fades in and out over the normal one when the category is missing. */}
              {category ? null : (
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: flash, backgroundColor: m3.errorContainer, borderRadius: shape.full, borderWidth: 1, borderColor: m3.error, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}>
                  <Icon name="apps-outline" size={18} color={m3.onErrorContainer} />
                  <AppText variant="labelLarge" color={m3.onErrorContainer}>
                    Category
                  </AppText>
                </Animated.View>
              )}
            </Animated.View>
          )}
        </View>

        {pickingCategory ? (
          <EnterSlide from="right">
            <CategoryGrid
              categories={typeCategories}
              selectedId={categoryId}
              onPick={(cat) => {
                Haptics.selection();
                pickCategory(cat.id);
                setPickingCategory(false);
              }}
            />
          </EnterSlide>
        ) : noteFocused ? (
          <View style={{ height: 8 }} />
        ) : (
          <EnterSlide from="left">
            <NumberPad raw={raw} onChange={setRaw} entryType={entryType} onSubmit={submit} submitLabel="Save entry" decimals={decimals} />
          </EnterSlide>
        )}
      </View>

      {datePicker.element}
      <CustomRepeat
        visible={customOpen}
        initialType={repeat > 0 ? repeat : 2}
        initialEvery={every}
        onCancel={() => setCustomOpen(false)}
        onDone={(type, n) => {
          setRepeat(type);
          setEvery(n);
          setCustomOpen(false);
        }}
      />
    </Reanimated.View>
    </GestureDetector>
  );
}

const shortName = (cat: Category) => (cat.asset ? cat.name.replace(/ Fund$/, '') : cat.name);

/** A single scrolling row of filter chips, one per category. */
function CategoryChips({ categories, selectedId, onPick }: { categories: Category[]; selectedId: string | null; onPick: (c: Category) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 12 }}>
      {categories.map((cat) => (
        <FilterChip key={cat.id} emoji={cat.emoji} label={shortName(cat)} selected={cat.id === selectedId} accessibilityLabel={`Category ${cat.name}`} onPress={() => onPick(cat)} />
      ))}
    </ScrollView>
  );
}

/** Every category as a two-column grid of choice cards, in the keypad's place. */
function CategoryGrid({ categories, selectedId, onPick }: { categories: Category[]; selectedId: string | null; onPick: (c: Category) => void }) {
  const { m3 } = useTheme();
  const rows: Category[][] = [];
  for (let i = 0; i < categories.length; i += 2) rows.push(categories.slice(i, i + 2));

  return (
    <View style={styles.grid}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
        {categories.length === 0 ? (
          <AppText variant="bodyLarge" color={m3.onSurfaceVariant} style={{ textAlign: 'center', marginTop: 24 }}>
            No categories yet
          </AppText>
        ) : null}
        {rows.map((row) => (
          <View key={row[0].id} style={{ flexDirection: 'row', gap: 8 }}>
            {row.map((cat) => (
              <ChoiceCard key={cat.id} label={shortName(cat)} leading={<EmojiAvatar emoji={cat.emoji} colour={cat.colour} size={36} />} selected={cat.id === selectedId} onPress={() => onPick(cat)} style={{ flex: 1 }} />
            ))}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </ScrollView>
      <View style={{ alignItems: 'center', paddingTop: 4 }}>
        <Button variant="text" icon="create-outline" label="Edit categories" onPress={() => router.push('/categories')} />
      </View>
    </View>
  );
}

function CustomRepeat({
  visible,
  initialType,
  initialEvery,
  onCancel,
  onDone,
}: {
  visible: boolean;
  initialType: RecurringType;
  initialEvery: number;
  onCancel: () => void;
  onDone: (type: 1 | 2 | 3, every: number) => void;
}) {
  const { m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<1 | 2 | 3>(initialType === 0 ? 2 : (initialType as 1 | 2 | 3));
  const [n, setN] = useState(Math.max(1, initialEvery));

  return (
    <BottomSheet visible={visible} onClose={onCancel} bottomInset={insets.bottom}>
      <AppText variant="titleLarge" color={m3.onSurface}>
        Repeat every
      </AppText>
      <View style={styles.counter}>
        <IconButton icon="remove" onPress={() => setN(Math.max(1, n - 1))} label="Fewer" tint={m3.onSurface} />
        <AppText variant="displaySmall" color={m3.onSurface}>
          {n}
        </AppText>
        <IconButton icon="add" onPress={() => setN(Math.min(99, n + 1))} label="More" tint={m3.onSurface} />
      </View>
      <SegmentedButton
        fullWidth
        options={([1, 2, 3] as const).map((u) => `${UNIT[u][0].toUpperCase()}${UNIT[u].slice(1)}${n === 1 ? '' : 's'}`)}
        index={type - 1}
        onChange={(i) => setType((i + 1) as 1 | 2 | 3)}
      />
      <View style={{ marginTop: 24 }}>
        <Button large label="Set repeat" onPress={() => onDone(type, n)} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  middle: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Pinned to the right edge, level with the amount, so it never sits on top of the digits.
  backspace: { position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center' },
  pillRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12, height: 40 },
  // The same height as the keypad it replaces.
  grid: { height: 280 },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30 },
});
