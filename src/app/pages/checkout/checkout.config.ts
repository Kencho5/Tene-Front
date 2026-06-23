import { ComboboxItems } from '@core/interfaces/combobox.interface';

export type DeliveryTime = 'same_day' | 'next_day';

export const DELIVERY_PRICES = {
  sameDay: 15,
  nextDay: 6,
  outsideTbilisi: 6,
  highMountain: 8,
} as const;

export const TBILISI_DEFAULT_EXPRESS_PRICE = 25;

export const TBILISI_REGION_EXPRESS_PRICE: Record<string, number> = {
  'vake-saburtalo': 15,
  'didube-chughureti': 15,
  'dzveli-tbilisi': 15,
  'isani-samgori': 25,
  'gldani-nadzaladevi': 25,
};

export const TBILISI_REGIONS: ComboboxItems[] = [
  { value: 'vake-saburtalo', label: 'ვაკე-საბურთალო' },
  { value: 'didube-chughureti', label: 'დიდუბე-ჩუღურეთი' },
  { value: 'dzveli-tbilisi', label: 'ძველი თბილისი' },
  { value: 'isani-samgori', label: 'ისანი-სამგორი' },
  { value: 'gldani-nadzaladevi', label: 'გლდანი-ნაძალადევი' },
];

export function tbilisiExpressPrice(region: string): number {
  return TBILISI_REGION_EXPRESS_PRICE[region] ?? TBILISI_DEFAULT_EXPRESS_PRICE;
}

export const SAME_DAY_CUTOFF = { hour: 17, minute: 30 } as const;

export const HIGH_MOUNTAIN_CITIES: ReadonlySet<string> = new Set([
  'mestia',
  'oni',
  'ambrolauri',
  'khulo',
  'shuakhevi',
]);

export const CHECKOUT_STRINGS = {
  sameDayUnavailableSuffix: '(შესაძლებელია 17:30-მდე გაფორმებულ შეკვეთებზე)',
  sameDayOutsideTbilisi: 'ხელმისაწვდომია მხოლოდ თბილისში',
  sameDayPastCutoff: 'ხელმისაწვდომია 17:30-მდე',
  sameDayLabelPrefix: '1 საათში მიწოდება',
  nextDayLabelPrefix: 'მომდევნო სამუშაო დღეს',
  outsideTbilisiLabelPrefix: 'მიწოდება 2-3 დღეში',
  highMountainLabelPrefix: 'მიწოდება 3-5 დღეში',
  free: 'უფასო',
  highMountainNotice:
    'მაღალმთიან რეგიონში (სვანეთი, რაჭა, ხევსურეთი, თუშეთი, ზემო აჭარა) მიწოდების ღირებულებაა 8 ₾ და ხორციელდება 3-5 დღეში.',
  outsideTbilisiNotice:
    'თბილისის გარეთ მიწოდების ღირებულებაა 6 ₾ და ხორციელდება 2-3 დღეში. იმავე დღის მიწოდება ხელმისაწვდომია მხოლოდ თბილისში.',
} as const;

export function formatGel(value: number): string {
  return value === 0 ? CHECKOUT_STRINGS.free : `${value}₾`;
}
