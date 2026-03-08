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
import { catchError, map, of } from 'rxjs';
import { SharedModule } from '@shared/shared.module';
import { ProductCardComponent } from '@shared/components/ui/product-card/product-card.component';
import { ProductCardSkeletonComponent } from '@shared/components/ui/product-card-skeleton/product-card-skeleton.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@shared/components/ui/breadcrumb/breadcrumb.component';
import { ProductsService } from '@core/services/products/products.service';
import { CategoriesService } from '@core/services/categories/categories.service';
import { SeoService } from '@core/services/seo/seo.service';
import { SchemaService } from '@core/services/seo/schema.service';
import { CategoryTreeNode } from '@core/interfaces/categories.interface';
import { ProductSearchResponse } from '@core/interfaces/products.interface';

@Component({
  selector: 'app-category',
  imports: [SharedModule, ProductCardComponent, ProductCardSkeletonComponent, BreadcrumbComponent],
  templateUrl: './category.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryComponent {
  private readonly router = inject(Router);
  private readonly productsService = inject(ProductsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly seoService = inject(SeoService);
  private readonly schemaService = inject(SchemaService);

  readonly slug = input.required<string>();

  readonly categoryTree = rxResource({
    defaultValue: [] as CategoryTreeNode[],
    stream: () =>
      this.categoriesService.getCategoryTree().pipe(
        map((res) => res.categories),
        catchError(() => of([] as CategoryTreeNode[])),
      ),
  });

  readonly category = computed(() => {
    const slug = this.slug();
    const tree = this.categoryTree.value();
    return this.findCategoryBySlug(tree, slug);
  });

  readonly parentCategory = computed(() => {
    const slug = this.slug();
    const tree = this.categoryTree.value();
    for (const parent of tree) {
      if (parent.slug === slug) return null;
      const child = parent.children.find((c) => c.slug === slug);
      if (child) return parent;
    }
    return null;
  });

  readonly childCategories = computed(() => {
    const cat = this.category();
    return cat?.children ?? [];
  });

  readonly categoryId = computed(() => this.category()?.id ?? null);

  readonly searchResponse = rxResource({
    defaultValue: { products: [], total: 0, limit: 0, offset: 0 } as ProductSearchResponse,
    params: () => this.categoryId(),
    stream: ({ params: categoryId }) => {
      if (!categoryId) return of({ products: [], total: 0, limit: 0, offset: 0 } as ProductSearchResponse);
      return this.productsService.searchProduct(`category_id=${categoryId}&in_stock=true&limit=20`);
    },
  });

  readonly products = computed(() => this.searchResponse.value().products);
  readonly totalProducts = computed(() => this.searchResponse.value().total);

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [{ label: 'მთავარი', route: '/' }];
    const parent = this.parentCategory();
    const cat = this.category();
    if (parent) {
      items.push({ label: parent.name, route: `/category/${parent.slug}` });
    }
    if (cat) {
      items.push({ label: cat.name });
    }
    return items;
  });

  constructor() {
    effect(() => {
      const cat = this.category();
      const total = this.totalProducts();
      if (!cat) return;

      const title = `${cat.name} - იყიდე ონლაინ | Tene`;
      const description = `${cat.name} ★ ${total}+ პროდუქტი ★ საუკეთესო ფასები ★ მიწოდება თბილისში და საქართველოს მასშტაბით ★ Tene.ge`;
      const url = `https://tene.ge/category/${cat.slug}`;

      this.seoService.setMetaTags({
        title,
        description,
        url,
        type: 'website',
        keywords: `${cat.name}, ${cat.name} ყიდვა, ${cat.name} ონლაინ, ტექნიკა, Tene`,
      });

      this.schemaService.clearSchemas();

      this.schemaService.addBreadcrumbSchema(
        this.breadcrumbs().map((b) => ({
          name: b.label,
          url: b.route ? `https://tene.ge${b.route}` : url,
        })),
      );

      const productItems = this.products().slice(0, 10).map((p, i) => ({
        '@type': 'ListItem' as const,
        position: i + 1,
        name: p.data.name,
        url: `https://tene.ge/products/${p.data.id}`,
      }));

      if (productItems.length > 0) {
        this.schemaService['injectSchema']({
          '@context': 'https://schema.org/',
          '@type': 'CollectionPage',
          name: cat.name,
          description,
          url,
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: total,
            itemListElement: productItems,
          },
        });
      }
    });

    effect(() => {
      const cat = this.category();
      const treeLoaded = this.categoryTree.value().length > 0;
      if (treeLoaded && !cat) {
        this.router.navigate(['/404'], { replaceUrl: true });
      }
    });
  }

  private findCategoryBySlug(nodes: CategoryTreeNode[], slug: string): CategoryTreeNode | null {
    for (const node of nodes) {
      if (node.slug === slug) return node;
      const found = this.findCategoryBySlug(node.children, slug);
      if (found) return found;
    }
    return null;
  }
}
