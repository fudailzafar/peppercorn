import { MaterialIcons } from '@expo/vector-icons';
import type { StyleProp, TextStyle } from 'react-native';

/**
 * The app's icons, drawn with Google's Material Icons. Screens refer to icons by a short semantic name
 * and this table picks the Material glyph for each.
 * Reference: https://fonts.google.com/icons
 */
const MATERIAL = {
  add: 'add',
  albums: 'view-agenda',
  alert: 'warning',
  'alert-circle': 'error-outline',
  'apps-outline': 'apps',
  'arrow-back': 'arrow-back',
  'arrow-up': 'arrow-upward',
  'backspace-outline': 'backspace',
  calendar: 'calendar-today',
  'calendar-clear': 'calendar-month',
  'calendar-number': 'date-range',
  cash: 'payments',
  checkmark: 'check',
  'checkmark-circle': 'check-circle',
  'chevron-back': 'chevron-left',
  'chevron-down': 'expand-more',
  'chevron-forward': 'chevron-right',
  'chevron-up': 'expand-less',
  close: 'close',
  contrast: 'contrast',
  'create-outline': 'edit',
  'ellipsis-vertical': 'more-vert',
  'file-tray-outline': 'inbox',
  'finger-print': 'fingerprint',
  flash: 'bolt',
  grid: 'grid-view',
  keypad: 'dialpad',
  'logo-usd': 'attach-money',
  'log-out': 'logout',
  'phone-portrait-outline': 'smartphone',
  options: 'tune',
  pencil: 'edit',
  pricetags: 'sell',
  radio: 'radio-button-checked',
  remove: 'remove',
  'remove-circle': 'remove-circle',
  repeat: 'repeat',
  search: 'search',
  share: 'share',
  sunny: 'wb-sunny',
  'swap-vertical': 'swap-vert',
  today: 'today',
  trash: 'delete',
  'trash-bin': 'delete',
  'trash-outline': 'delete-outline',
  'trending-down': 'trending-down',
  'trending-up': 'trending-up',
  wallet: 'account-balance-wallet',
  // Saving to Drive
  cloud: 'cloud-done',
  'cloud-off': 'cloud-off',
  sync: 'sync',
  // Home and profile
  lock: 'lock-outline',
  person: 'person-outline',
  history: 'history',
  expense: 'north-east',
  income: 'south-west',
  // Bottom navigation destinations
  home: 'home',
  assets: 'savings',
  insights: 'bar-chart',
  budget: 'account-balance-wallet',
} as const satisfies Record<string, keyof typeof MaterialIcons.glyphMap>;

export type IconName = keyof typeof MATERIAL;

export function Icon({ name, size = 24, color, style }: { name: IconName; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <MaterialIcons name={MATERIAL[name]} size={size} color={color} style={style} />;
}
