export function normalizePhoneNumber(input: string): string | null {
  let digits = (input ?? '').replace(/[\s\-()+]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith('00995')) digits = digits.slice(2);
  if (digits.length === 9) digits = `995${digits}`;
  return /^9955\d{8}$/.test(digits) ? digits : null;
}

export function isValidPhoneNumber(input: string): boolean {
  return normalizePhoneNumber(input) !== null;
}

export function formatPhoneNumber(input: string): string {
  const normalized = normalizePhoneNumber(input);
  if (!normalized) return input;
  const local = normalized.slice(3);
  return `+995 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
