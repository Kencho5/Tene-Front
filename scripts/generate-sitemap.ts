import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import slugifyLib from 'slugify';

const BASE_URL = 'https://tene.ge';
const API_BASE_URL = 'https://api.tene.ge';

interface SitemapEntry {
  url: string;
  priority: string;
  changefreq: string;
}

const escapeXml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;');

const generateProductSlug = (text: string) =>
  slugifyLib(text, {
    lower: true,
    strict: true,
    locale: 'en',
    remove: /[*+~.()'"!:@]/g,
  });

function flattenCategories(nodes: any[]): any[] {
  let result: any[] = [];
  for (const node of nodes) {
    if (node.slug) result.push(node);
    if (node.children?.length) result = result.concat(flattenCategories(node.children));
  }
  return result;
}

async function fetchAllProducts(): Promise<any[]> {
  const limit = 200;
  let offset = 0;
  let allProducts: any[] = [];

  while (true) {
    const res = await fetch(`${API_BASE_URL}/products?in_stock=true&limit=${limit}&offset=${offset}`);
    const data = await res.json();
    const products = data.products || [];
    allProducts = allProducts.concat(products);

    if (products.length < limit || allProducts.length >= data.total) break;
    offset += limit;
  }

  return allProducts;
}

function buildSitemap(entries: SitemapEntry[]): string {
  const currentDate = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const entry of entries) {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(BASE_URL + entry.url)}</loc>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    xml += `    <priority>${entry.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  xml += '</urlset>';
  return xml;
}

async function main() {
  console.log('Generating sitemap...');

  const entries: SitemapEntry[] = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/products', priority: '0.9', changefreq: 'daily' },
    { url: '/bins', priority: '0.7', changefreq: 'weekly' },
    { url: '/contact', priority: '0.4', changefreq: 'monthly' },
    { url: '/about', priority: '0.4', changefreq: 'monthly' },
  ];

  // Store pages
  const storeCities = ['tbilisi', 'batumi', 'kutaisi', 'rustavi', 'poti'];
  for (const city of storeCities) {
    entries.push({ url: `/store/${city}`, priority: '0.6', changefreq: 'monthly' });
  }

  try {
    // Categories
    const categoriesRes = await fetch(`${API_BASE_URL}/categories/tree`).then((r) => r.json());
    const categories = flattenCategories(categoriesRes.categories || []);
    for (const cat of categories) {
      entries.push({ url: `/category/${cat.slug}`, priority: '0.8', changefreq: 'daily' });
    }
    console.log(`  ${categories.length} categories`);

    // Brands
    const facetsRes = await fetch(`${API_BASE_URL}/products/facets`).then((r) => r.json());
    const excludedBrands = new Set(['-', 'უბრენდო']);
    const brands = (facetsRes.brands || []).filter(
      (b: any) => b.count > 0 && !excludedBrands.has(b.name),
    );
    for (const brand of brands) {
      entries.push({
        url: `/brand/${brand.name.toLowerCase().replace(/\s+/g, '-')}`,
        priority: '0.7',
        changefreq: 'daily',
      });
    }
    console.log(`  ${brands.length} brands`);

    // Products (paginated)
    const products = await fetchAllProducts();
    for (const p of products) {
      const name = p.data?.name || '';
      const id = p.data?.id;
      if (!name || !id) continue;
      entries.push({
        url: `/products/${generateProductSlug(name)}/${id}`,
        priority: '0.6',
        changefreq: 'weekly',
      });
    }
    console.log(`  ${products.length} products`);
  } catch (err) {
    console.error('Warning: Failed to fetch dynamic data from API:', err);
    console.log('  Generating sitemap with static pages only');
  }

  const sitemap = buildSitemap(entries);
  const outputPath = join(new URL('.', import.meta.url).pathname, '..', 'public', 'sitemap.xml');
  writeFileSync(outputPath, sitemap, 'utf-8');

  console.log(`Sitemap generated: ${entries.length} URLs → public/sitemap.xml`);
}

main();
