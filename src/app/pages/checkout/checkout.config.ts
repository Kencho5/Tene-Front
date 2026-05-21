export type DeliveryTime = 'same_day' | 'next_day';

export const DELIVERY_PRICES = {
  sameDay: 12,
  nextDay: 6,
  outsideTbilisi: 8.5,
  highMountain: 13.5,
} as const;

export const SAME_DAY_CUTOFF = { hour: 17, minute: 30 } as const;

export const HIGH_MOUNTAIN_CITIES: ReadonlySet<string> = new Set([
  'mestia',
  'oni',
  'ambrolauri',
  'khulo',
  'shuakhevi',
]);

export const CHECKOUT_STRINGS = {
  sameDayUnavailableSuffix: '(შესაძლებელია მხოლოდ თბილისში, 17:30-მდე გაფორმებულ შეკვეთებზე)',
  sameDayOutsideTbilisi: 'ხელმისაწვდომია მხოლოდ თბილისში',
  sameDayPastCutoff: 'ხელმისაწვდომია 17:30-მდე',
  sameDayLabelPrefix: 'დღეს დღის ბოლომდე',
  nextDayLabelPrefix: 'მომდევნო სამუშაო დღეს',
  free: 'უფასო',
  highMountainNotice:
    'მაღალმთიან რეგიონში (სვანეთი, რაჭა, ხევსურეთი, თუშეთი, ზემო აჭარა) მიწოდების ღირებულებაა 13.50 ₾.',
  outsideTbilisiNotice:
    'თბილისის გარეთ მიწოდების ღირებულებაა 8.50 ₾. იმავე დღის მიწოდება ხელმისაწვდომია მხოლოდ თბილისში.',
} as const;

export function formatGel(value: number): string {
  return value === 0 ? CHECKOUT_STRINGS.free : `${value}₾`;
}
