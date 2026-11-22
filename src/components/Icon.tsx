import { MaterialIcons } from '@expo/vector-icons';
import type { StyleProp, TextStyle } from 'react-native';

/**
 * Dime's icons, drawn with Google's Material Icons. Screens refer to icons by a short semantic name
 * (the names Dime's screens already used) and this table picks the Material glyph for each.
 * Reference: https://fonts.google.com/icons
 */
const MATERIAL = {
  add: 'add',
  albums: 'view-agenda',
  alert: 'warning',
  'alert-circle': 'error-outline',
  'apps-outline': 'apps',
  'arrow-back': 'arrow-back',
  'arrow-back-circle': 'arrow-circle-left',
  'arrow-forward-circle': 'arrow-circle-right',
  'arrow-down': 'arrow-downward',
  'arrow-up': 'arrow-upward',
  'arrow-undo-circle': 'undo',
  'backspace-outline': 'backspace',
  calendar: 'calendar-today',
  'calendar-clear': 'calendar-month',
  'calendar-number': 'date-range',
  'calendar-outline': 'calendar-today',
  cash: 'payments',
  'cash-outline': 'payments',
  checkmark: 'check',
  'checkmark-circle': 'check-circle',
  'chevron-back': 'chevron-left',
  'chevron-down': 'expand-more',
  'chevron-forward': 'chevron-right',
  'chevron-up': 'expand-less',
  close: 'close',
  'close-circle': 'cancel',
  contrast: 'contrast',
  'create-outline': 'edit',
  'ellipsis-vertical': 'more-vert',
  'file-tray-outline': 'inbox',
  'finger-print': 'fingerprint',
  flash: 'bolt',
  glasses: 'visibility',
  grid: 'grid-view',
  'help-circle-outline': 'help-outline',
  'information-circle': 'info',
  keypad: 'dialpad',
  'logo-usd': 'attach-money',
  options: 'tune',
  'options-outline': 'tune',
  'partly-sunny': 'wb-sunny',
  pencil: 'edit',
  pricetags: 'sell',
  radio: 'radio-button-checked',
  receipt: 'receipt-long',
  remove: 'remove',
  'remove-circle': 'remove-circle',
  repeat: 'repeat',
  search: 'search',
  settings: 'settings',
  share: 'share',
  'stats-chart': 'bar-chart',
  sunny: 'wb-sunny',
  'swap-vertical': 'swap-vert',
  today: 'today',
  trash: 'delete',
  'trash-bin': 'delete',
  'trash-outline': 'delete-outline',
  'trending-down': 'trending-down',
  'trending-up': 'trending-up',
  wallet: 'account-balance-wallet',
  'wallet-outline': 'account-balance-wallet',
  // Bottom navigation destinations
  log: 'receipt-long',
  insights: 'bar-chart',
  budget: 'account-balance-wallet',
} as const satisfies Record<string, keyof typeof MaterialIcons.glyphMap>;

export type IconName = keyof typeof MATERIAL;

export function Icon({ name, size = 24, color, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <MaterialIcons name={MATERIAL[name]} size={size} color={color} style={style} />;
}
