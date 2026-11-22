import { goBack } from '../lib/nav';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Animated, BackHandler, Easing, Keyboard, Modal, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { Icon } from '../components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Reanimated, { Easing as ReEasing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AppText } from '../components/AppText';
import { BigAmount, CircleButton } from '../components/Bits';
import { useDateTimePicker } from '../components/DateTimeField';
import { EnterSlide } from '../components/EnterSlide';
import { Chip, IconButton, OutlinedField, SegmentedButton } from '../components/m3';
import { NumberPad } from '../components/NumberPad';
import { Popover, PopoverItem, useAnchor, anchorProps } from '../components/Overlays';
import { display, fromNumber, toNumber, type EntryType } from '../lib/amount';
import { dayLabel, isSameDay, time24 } from '../lib/dates';
import { Haptics } from '../lib/haptics';
import { useStore, useUi } from '../lib/store';
import { useNow } from '../lib/useNow';
import type { Category, RecurringType } from '../lib/types';
import { springs } from '../theme/motion';
import { m3Duration, m3Easing, shape } from '../theme/material';
import { useTheme, withAlpha } from '../theme/theme';

const REPEAT_LABELS: Record<RecurringType, string> = { 0: 'none', 1: 'daily', 2: 'weekly', 3: 'monthly' };
const UNIT: Record<1 | 2 | 3, string> = { 1: 'day', 2: 'week', 3: 'month' };

/** Add or edit a transaction (full-screen, slides up from the tab bar's "+"). */
export default function TransactionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { c, m3 } = useTheme();
  const insets = useSafeAreaInsets();
  const existing = useStore((s) => s.transactions.find((t) => t.id === id));
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const showToast = useUi((s) => s.showToast);
  const entryType = settings.numberEntryType as EntryType;

  const [income, setIncome] = useState(existing?.income ?? false);
  const [raw, setRaw] = useState(() => (existing ? fromNumber(existing.amount, entryType) : ''));
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState(() => (existing ? new Date(existing.date) : new Date()));
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [repeat, setRepeat] = useState<RecurringType>(existing?.recurringType ?? 0);
  const [every, setEvery] = useState(existing?.recurringCoefficient || 1);
  const [pickingCategory, setPickingCategory] = useState(false);
  const [noteFocused, setNoteFocused] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const now = useNow();
  const repeatMenu = useAnchor();
  const datePicker = useDateTimePicker(date, setDate);

  const category = categories.find((x) => x.id === categoryId);
  const typeCategories = useMemo(() => categories.filter((x) => x.income === income).sort((a, b) => a.order - b.order), [categories, income]);

  const suggestions = useMemo(() => {
    const q = note.trim().toLowerCase();
    if (!noteFocused || q.length === 0) return [];
    const seen = new Set<string>();
    return transactions
      .filter((t) => t.income === income && t.note.toLowerCase().includes(q) && t.note.toLowerCase() !== q)
      .sort((a, b) => b.date - a.date)
      .filter((t) => (seen.has(t.note) ? false : (seen.add(t.note), true)))
      .slice(0, 3);
  }, [note, noteFocused, transactions, income]);

  const amount = toNumber(raw, entryType);

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
          withTiming(screenHeight, { duration: 220, easing: ReEasing.out(ReEasing.cubic) }, (finished) => {
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

  const submit = () => {
    if (amount <= 0 && !categoryId) {
      Haptics.error();
      showToast({ title: 'Incomplete Entry', icon: 'help-circle-outline', tone: 'error' }, 2000);
      flashCategory();
      return;
    }
    if (amount <= 0) {
      Haptics.error();
      showToast({ title: 'Missing Amount', icon: 'cash-outline', tone: 'error' }, 2000);
      return;
    }
    if (!categoryId) {
      Haptics.error();
      showToast({ title: 'Missing Category', icon: 'file-tray-outline', tone: 'error' }, 2000);
      flashCategory();
      return;
    }
    const input = { amount, date: date.getTime(), note, income, categoryId, recurringType: repeat, recurringCoefficient: repeat > 0 ? every : 0 };
    if (existing) updateTransaction(existing.id, input);
    else addTransaction(input);
    Haptics.success();
    close();
  };

  const switchType = (next: boolean) => {
    if (next === income) return;
    Haptics.selection();
    setIncome(next);
    setCategoryId(null);
  };

  const todayish = isSameDay(date, now);
  const dateText = todayish ? `Today, ${date.getDate()} ${dayLabel(date).split(' ')[2]}` : dayLabel(date);

  return (
    <GestureDetector gesture={dragDown}>
    <Reanimated.View style={[{ flex: 1, backgroundColor: c.PrimaryBackground, paddingTop: insets.top + 10 }, sheetStyle]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <IconButton icon="close" onPress={close} label="Close" />

        {settings.incomeTracking ? (
          <SegmentedButton options={['Expense', 'Income']} index={income ? 1 : 0} onChange={(i) => switchType(i === 1)} />
        ) : (
          <View />
        )}

        <View {...anchorProps(repeatMenu)}>
          <IconButton icon="repeat" onPress={repeatMenu.open} label="Repeat" tint={repeat > 0 ? m3.primary : undefined} />
        </View>
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
          label="custom"
          selected={repeat > 0 && every > 1}
          onPress={() => {
            repeatMenu.close();
            setCustomOpen(true);
          }}
        />
      </Popover>

      {/* Amount and note */}
      <View style={styles.middle}>
        <View style={{ paddingHorizontal: 40 }}>
          <BigAmount value={display(raw, entryType)} currency={settings.currency} size={57} color={income && amount > 0 ? 'IncomeGreen' : 'PrimaryText'} />
          {entryType === 2 && raw.length > 0 ? (
            <View style={styles.backspace}>
              <IconButton icon="backspace-outline" onPress={() => setRaw(raw.slice(0, -1))} label="Delete digit" />
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 24 }}>
          <OutlinedField
            label="Note"
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

        {repeat > 0 ? (
          <Chip
            icon="repeat"
            label={every === 1 ? `Repeats ${REPEAT_LABELS[repeat]}` : `Every ${every} ${UNIT[repeat as 1 | 2 | 3]}s`}
            tint={m3.secondaryContainer}
            onTint={m3.onSecondaryContainer}
            onPress={repeatMenu.open}
            style={{ marginTop: 16 }}
          />
        ) : null}

        {suggestions.length > 0 ? (
          <View style={{ marginTop: 14, gap: 8, alignItems: 'center' }}>
            {suggestions.map((s) => (
              <Chip
                key={s.id}
                label={s.note}
                onPress={() => {
                  setNote(s.note);
                  setCategoryId(s.categoryId);
                  if (raw === '') setRaw(fromNumber(s.amount, entryType));
                  Keyboard.dismiss();
                }}
                tint={m3.surfaceContainerHigh}
                onTint={m3.onSurface}
              />
            ))}
          </View>
        ) : null}
      </View>

      {/* Bottom: date, category and the pad */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}>
        <View style={styles.pillRow}>
          <Chip icon="calendar-outline" label={`${dateText}  ${time24(date)}`} onPress={datePicker.open} accessibilityLabel="Change date" style={{ flex: 1 }} />

          {pickingCategory ? (
            <Chip label="Close" icon="close" onPress={() => setPickingCategory(false)} tint={m3.errorContainer} onTint={m3.onErrorContainer} style={{ minWidth: 120 }} />
          ) : (
            <Animated.View style={{ minWidth: 120, maxWidth: 190, flexShrink: 0, transform: [{ translateX: shake }] }}>
              <Chip
                accessibilityLabel="Choose category"
                icon={category ? undefined : 'apps-outline'}
                label={category ? `${category.emoji}  ${category.name}` : 'Category'}
                tint={category ? withAlpha(category.colour, 0.3) : undefined}
                onTint={category ? category.colour : undefined}
                onPress={() => {
                  Keyboard.dismiss();
                  setPickingCategory(true);
                }}
              />
              {/* Error state that fades in and out over the normal one when the category is missing. */}
              {category ? null : (
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: flash, backgroundColor: m3.errorContainer, borderRadius: shape.full, borderWidth: 1, borderColor: m3.error, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}>
                  <Icon name="apps-outline" size={18} color={m3.onErrorContainer} />
                  <AppText size={14} weight="semibold" color={m3.onErrorContainer}>
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
              onPick={(cat) => {
                Haptics.selection();
                setCategoryId(cat.id);
                setPickingCategory(false);
              }}
            />
          </EnterSlide>
        ) : noteFocused ? (
          <View style={{ height: 8 }} />
        ) : (
          <EnterSlide from="left">
            <NumberPad raw={raw} onChange={setRaw} entryType={entryType} onSubmit={submit} />
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

/** Categories as tinted pills, filled from the bottom-right so they sit under the thumb. */
function CategoryGrid({ categories, onPick }: { categories: Category[]; onPick: (c: Category) => void }) {
  const { m3 } = useTheme();
  const rows: Category[][] = [];
  for (let i = 0; i < categories.length; i += 2) rows.push(categories.slice(i, i + 2));
  rows.reverse();

  return (
    <View style={{ height: 66 * 4 + 30 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', gap: 10, paddingHorizontal: 15, paddingBottom: 64 }}>
        {categories.length === 0 ? (
          <AppText size={18} weight="medium" color="SubtitleText" style={{ textAlign: 'center' }}>
            No categories yet
          </AppText>
        ) : null}
        {rows.map((row, i) => (
          <View key={i} style={{ flexDirection: 'row-reverse', gap: 14 }}>
            {row.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => onPick(cat)}
                style={({ pressed }) => [styles.gridPill, { backgroundColor: withAlpha(cat.colour, pressed ? 0.5 : 0.3) }]}
              >
                <AppText size={20}>{cat.emoji}</AppText>
                <AppText size={20} weight="semibold" style={{ color: cat.colour }} numberOfLines={1}>
                  {cat.name}
                </AppText>
              </Pressable>
            ))}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </ScrollView>
      <View style={styles.editPill}>
        <Chip icon="create-outline" label="Edit" accessibilityLabel="Edit categories" tint={m3.surfaceContainerHigh} onTint={m3.onSurface} onPress={() => router.push('/categories')} />
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
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<1 | 2 | 3>(initialType === 0 ? 2 : (initialType as 1 | 2 | 3));
  const [n, setN] = useState(Math.max(1, initialEvery));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} onPress={onCancel} />
      <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: c.PrimaryBackground, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <AppText size={24} weight="medium">
            Repeat every
          </AppText>
          <View style={styles.counter}>
            <CircleButton size={48} onPress={() => setN(Math.max(1, n - 1))} label="Fewer">
              <Icon name="remove" size={24} color={c.DarkIcon} />
            </CircleButton>
            <AppText size={44} weight="medium">
              {n}
            </AppText>
            <CircleButton size={48} onPress={() => setN(Math.min(99, n + 1))} label="More">
              <Icon name="add" size={24} color={c.DarkIcon} />
            </CircleButton>
          </View>
          <View style={[styles.segWrap, { borderColor: c.Outline, alignSelf: 'center' }]}>
            {([1, 2, 3] as const).map((u) => (
              <Pressable key={u} onPress={() => setType(u)} style={[styles.seg, type === u && { backgroundColor: c.SecondaryBackground }]}>
                <AppText size={19} weight="semibold" color={type === u ? 'PrimaryText' : 'SubtitleText'}>
                  {UNIT[u]}
                  {n === 1 ? '' : 's'}
                </AppText>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => onDone(type, n)} style={[styles.bigButton, { backgroundColor: c.DarkBackground }]}>
            <AppText size={20} weight="semibold" color="LightIcon">
              Confirm
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  segWrap: { flexDirection: 'row', borderWidth: 1.5, borderRadius: 100, padding: 3 },
  seg: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 100 },
  middle: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backspace: { position: 'absolute', right: -4, top: 12 },
  // Fully rounded like the Expense | Income capsule, with the text centred and no leading icon.
  notePill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 3, marginTop: 12, minWidth: 0, maxWidth: 280 },
  noteInput: { fontSize: 18, flexShrink: 1, minWidth: 84, paddingVertical: 4, textAlign: 'center' },
  repeatChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, marginTop: 12 },
  suggestion: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  pillRow: { flexDirection: 'row', gap: 9, paddingHorizontal: 15, marginBottom: 10, height: 44 },
  datePill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 12 },
  catPill: { minWidth: 120, maxWidth: 170, flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14 },
  gridPill: { flex: 1, height: 48, borderRadius: shape.medium, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  editPill: { position: 'absolute', alignSelf: 'center', bottom: 6 },
  sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 28, gap: 20 },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30 },
  bigButton: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
