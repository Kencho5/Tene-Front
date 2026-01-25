import slugify from 'slugify';

export function generateSlug(text: string): string {
  return slugify(text, {
    lower: true,
    strict: true,
    locale: 'en',
    remove: /[*+~.()'"!:@]/g
  });
}

export function generateProductSlug(productName: string): string {
  return generateSlug(productName);
}

export function isValidSlug(slug: string): boolean {
  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
}

export function slugsMatch(slug1: string, slug2: string): boolean {
  return generateSlug(slug1) === generateSlug(slug2);
}
