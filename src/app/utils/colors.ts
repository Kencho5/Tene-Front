export const colorLabels: Record<string, string> = {
  beige: 'ბეჟი',
  black: 'შავი',
  blue: 'ლურჯი',
  brown: 'ყავისფერი',
  coral: 'მარჯნისფერი',
  cyan: 'ციანი',
  gold: 'ოქროსფერი',
  gray: 'ნაცრისფერი',
  green: 'მწვანე',
  lime: 'ლაიმისფერი',
  magenta: 'მაგენტა',
  maroon: 'წაბლისფერი',
  navy: 'მუქი ლურჯი',
  olive: 'ზეთისხილისფერი',
  orange: 'ნარინჯისფერი',
  pink: 'ვარდისფერი',
  purple: 'იისფერი',
  red: 'წითელი',
  silver: 'ვერცხლისფერი',
  teal: 'ტეალი',
  turquoise: 'ფირუზისფერი',
  white: 'თეთრი',
  yellow: 'ყვითელი',
};

export function getColorLabel(value: string): string {
  return colorLabels[value.toLowerCase()] ?? value;
}
