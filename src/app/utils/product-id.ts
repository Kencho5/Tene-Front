export function buildSearchParams(term: string, extra: Record<string, string> = {}): string {
  return new URLSearchParams({ query: term.trim(), ...extra }).toString();
}
