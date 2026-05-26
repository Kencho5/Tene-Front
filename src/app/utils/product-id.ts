export function isProductId(term: string): boolean {
  const value = term.trim();
  return /^[A-Za-z]+-[A-Za-z0-9]+$/.test(value) || /^\d{4,}$/.test(value);
}

export function buildSearchParams(term: string, extra: Record<string, string> = {}): string {
  const value = term.trim();
  const key = isProductId(value) ? 'id' : 'query';
  return new URLSearchParams({ [key]: value, ...extra }).toString();
}
