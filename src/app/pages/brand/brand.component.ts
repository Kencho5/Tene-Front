import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { map, of } from 'rxjs';
import { SharedModule } from '@shared/shared.module';
import { ProductCardComponent } from '@shared/components/ui/product-card/product-card.component';
import { ProductCardSkeletonComponent } from '@shared/components/ui/product-card-skeleton/product-card-skeleton.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/ui/breadcrumb/breadcrumb.component';
import { ProductsService } from '@core/services/products/products.service';
import { SeoService } from '@core/services/seo/seo.service';
import { SchemaService } from '@core/services/seo/schema.service';
import { ProductSearchResponse, ProductFacets } from '@core/interfaces/products.interface';

@Component({
  selector: 'app-brand',
  imports: [SharedModule, ProductCardComponent, ProductCardSkeletonComponent, BreadcrumbComponent],
  templateUrl: './brand.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandComponent {
  private readonly router = inject(Router);
  private readonly productsService = inject(ProductsService);
  private readonly seoService = inject(SeoService);
  private readonly schemaService = inject(SchemaService);

  readonly slug = input.required<string>();

  readonly facets = rxResource({
    defaultValue: { brands: [], colors: [], categories: [] } as ProductFacets,
    stream: () => this.productsService.getFacets(''),
  });

  readonly brand = computed(() => {
    const slug = this.slug();
    return this.facets.value().brands.find(
      (b) => b.name.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase(),
    ) ?? null;
  });

  readonly brandId = computed(() => this.brand()?.id ?? null);

  readonly searchResponse = rxResource({
    defaultValue: { products: [], total: 0, limit: 0, offset: 0 } as ProductSearchResponse,
    params: () => this.brandId(),
    stream: ({ params: brandId }) => {
      if (!brandId) return of({ products: [], total: 0, limit: 0, offset: 0 } as ProductSearchResponse);
      return this.productsService.searchProduct(`brand=${brandId}&in_stock=true&limit=20`);
    },
  });

  readonly products = computed(() => this.searchResponse.value().products);
  readonly totalProducts = computed(() => this.searchResponse.value().total);

  readonly brandCategories = computed(() => {
    const products = this.products();
    const categoryMap = new Map<number, { id: number; name: string; slug: string; count: number }>();
    for (const p of products) {
      for (const cat of p.categories) {
        const existing = categoryMap.get(cat.id);
        if (existing) {
          existing.count++;
        } else {
          categoryMap.set(cat.id, { ...cat, count: 1 });
        }
      }
    }
    return Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);
  });

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [{ label: 'მთავარი', route: '/' }];
    const b = this.brand();
    if (b) {
      items.push({ label: b.name });
    }
    return items;
  });

  constructor() {
    effect(() => {
      const brand = this.brand();
      const total = this.totalProducts();
      if (!brand) return;

      const slug = this.slug();
      const title = `${brand.name} - პროდუქცია | Tene`;
      const description = `${brand.name} პროდუქცია ★ ${total}+ პროდუქტი ★ ოფიციალური დისტრიბუტორი ★ საუკეთესო ფასები ★ მიწოდება საქართველოს მასშტაბით ★ Tene.ge`;
      const url = `https://tene.ge/brand/${slug}`;

      this.seoService.setMetaTags({
        title,
        description,
        url,
        type: 'website',
        keywords: `${brand.name}, ${brand.name} საქართველო, ${brand.name} ყიდვა, ${brand.name} პროდუქტები, Tene`,
      });

      this.schemaService.clearSchemas();

      this.schemaService.addBreadcrumbSchema(
        this.breadcrumbs().map((b) => ({
          name: b.label,
          url: b.route ? `https://tene.ge${b.route}` : url,
        })),
      );

      this.schemaService['injectSchema']({
        '@context': 'https://schema.org/',
        '@type': 'CollectionPage',
        name: `${brand.name} პროდუქცია`,
        description,
        url,
        about: {
          '@type': 'Brand',
          name: brand.name,
        },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: total,
          itemListElement: this.products().slice(0, 10).map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: p.data.name,
            url: `https://tene.ge/products/${p.data.id}`,
          })),
        },
      });
    });

    effect(() => {
      const facetsLoaded = this.facets.value().brands.length > 0;
      const brand = this.brand();
      if (facetsLoaded && !brand) {
        this.router.navigate(['/404'], { replaceUrl: true });
      }
    });
  }
}
