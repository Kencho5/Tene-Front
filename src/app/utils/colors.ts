export const colorLabels: Record<string, string> = {
  beige: 'კრემისფერი',
  black: 'შავი',
  blue: 'ლურჯი',
  brown: 'ყავისფერი',
  coral: 'მარჯანისფერი',
  cyan: 'ცისფერი',
  gold: 'ოქროსფერი',
  gray: 'რუხი',
  green: 'მწვანე',
  lime: 'ლაიმისფერი',
  magenta: 'ჟოლოსფერი',
  maroon: 'შინდისფერი',
  navy: 'მუქი ლურჯი',
  olive: 'ზეთისფერი',
  orange: 'ნარინჯისფერი',
  pink: 'ვარდისფერი',
  purple: 'იასამნისფერი',
  red: 'წითელი',
  silver: 'ვერცხლისფერი',
  teal: 'მორწყალი',
  turquoise: 'ფირუზისფერი',
  white: 'თეთრი',
  yellow: 'ყვითელი',
};

export function getColorLabel(value: string): string {
  return colorLabels[value.toLowerCase()] ?? value;
}
