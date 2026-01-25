export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u10A0-\u10FF-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateProductSlug(productName: string): string {
  return generateSlug(productName);
}

export function isValidSlug(slug: string): boolean {
  const slugPattern = /^[a-z0-9\u10A0-\u10FF]+(-[a-z0-9\u10A0-\u10FF]+)*$/;
  return slugPattern.test(slug);
}

export function slugsMatch(slug1: string, slug2: string): boolean {
  return generateSlug(slug1) === generateSlug(slug2);
}
