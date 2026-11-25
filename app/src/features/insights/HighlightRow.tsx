import { router } from 'expo-router';
import { shortLabel, toDay } from '@/domain/dates';
import type { Highlight } from '@/domain/insights';
import { openPage } from '@/lib/navigation';
import { useMoney, useNow } from '@/state/hooks';
import { EmojiAvatar, IconAvatar, ListItem } from '@/ui/material';

/** One thing worth noticing, leading to where it can be looked into. */
export function HighlightRow({ h, onCategory }: { h: Highlight; onCategory: (id: string) => void }) {
  const { brief } = useMoney();
  const today = toDay(useNow());
  switch (h.kind) {
    case 'assets':
      return <ListItem leading={<IconAvatar icon="assets" />} headline={`${brief(h.amount)} went into assets`} supporting="Gold, silver and funds: still yours" chevron onPress={() => router.navigate('/assets')} />;
    case 'forecast': {
      const over = h.budget === null ? 0 : h.amount - h.budget;
      const supporting = h.budget === null ? 'By the end of the month' : `${brief(over)} ${over > 0 ? 'over' : 'inside'} your budget`;
      return <ListItem leading={<IconAvatar icon="calendar" />} headline={`On pace for ${brief(h.amount)}`} supporting={supporting} chevron onPress={() => router.navigate('/budget')} />;
    }
    case 'change': {
      const way = h.amount > h.before ? 'up' : 'down';
      const { emoji, colour, name, id } = h.category;
      return <ListItem leading={<EmojiAvatar emoji={emoji} colour={colour} />} headline={`${name} is ${way} ${brief(h.amount - h.before)}`} supporting={`${brief(h.amount)}, ${way} from ${brief(h.before)}`} chevron onPress={() => onCategory(id)} />;
    }
    case 'biggest':
      return (
        <ListItem
          leading={<IconAvatar icon="arrow-up" />}
          headline={`Biggest: ${h.entry.note}, ${brief(h.entry.amount)}`}
          supporting={shortLabel(toDay(h.entry.date), today)}
          chevron
          onPress={() => openPage({ pathname: '/entry', params: { id: h.entry.id } })}
        />
      );
    case 'often':
      return <ListItem leading={<IconAvatar icon="repeat" />} headline={`${h.note}, ${h.times} times`} supporting={`${brief(h.amount)} in all`} chevron onPress={() => openPage({ pathname: '/search', params: { q: h.note } })} />;
  }
}
