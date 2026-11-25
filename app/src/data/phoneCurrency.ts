import { getCalendars, getLocales } from 'expo-localization';
import { CURRENCIES } from '@/domain/currencies';

/** The currency for a first launch: rupees in India, whatever the phone's language, or else the region's. */
export function phoneCurrency(zone = getCalendars()[0]?.timeZone, region = getLocales()[0]?.currencyCode): string {
  if (zone === 'Asia/Kolkata' || zone === 'Asia/Calcutta') return 'INR';
  return CURRENCIES.some((c) => c.code === region) ? (region as string) : 'USD';
}
