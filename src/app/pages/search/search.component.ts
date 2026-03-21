import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { ProductsService } from '@core/services/products/products.service';
import { CategoriesService } from '@core/services/categories/categories.service';
import { CategoryTreeNode } from '@core/interfaces/categories.interface';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { ProductCardComponent } from '@shared/components/ui/product-card/product-card.component';
import { ProductCardSkeletonComponent } from '@shared/components/ui/product-card-skeleton/product-card-skeleton.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import { SharedModule } from '@shared/shared.module';
import { DragScrollDirective } from '@core/directives/drag-scroll.directive';
import { ProductFacets, ProductSearchResponse } from '@core/interfaces/products.interface';
import { getColorLabel } from '@utils/colors';
import { map } from 'rxjs';

@Component({
  selector: 'app-search',
  imports: [
    SharedModule,
    DragScrollDirective,
    DropdownComponent,
    ProductCardComponent,
    ProductCardSkeletonComponent,
    PaginationComponent,
  ],
  templateUrl: './search.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @keyframes fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes fade-out {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    @keyframes slide-up-fade {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slide-down-enter {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slide-up-leave {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-8px);
      }
    }

    @keyframes slide-left-enter {
      from {
        opacity: 0;
        transform: translateX(16px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes mobile-sheet-enter {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }

    @keyframes mobile-sheet-leave {
      from {
        transform: translateY(0);
      }
      to {
        transform: translateY(100%);
      }
    }

    @keyframes scale-fade-in {
      from {
        opacity: 0;
        transform: scale(0.97);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
})
export class SearchComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productsService = inject(ProductsService);
  private readonly categoriesService = inject(CategoriesService);
  private debounceTimer?: number;

  readonly getColorLabel = getColorLabel;

  readonly params = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });
  readonly isFilterOpen = signal<boolean>(false);
  readonly isCategoryExpanded = signal(false);
  readonly expandedParentId = linkedSignal(() => this.categoryTree.value()[0]?.id ?? null);
  readonly brandSearch = signal<string>('');
  readonly categorySearch = signal<string>('');
  readonly showAllBrands = signal(false);
  readonly showAllColors = signal(false);
  readonly showAllCategories = signal(false);

  readonly sortOptions: ComboboxItems[] = [
    { label: 'პოპულარული', value: 'views_desc' },
    { label: 'ფასი: კლებადობით', value: 'price_desc' },
    { label: 'ფასი: ზრდადობით', value: 'price_asc' },
  ];

  readonly searchResponse = rxResource({
    defaultValue: { products: [], total: 0, limit: 0, offset: 0 } as ProductSearchResponse,
    params: () => {
      const urlParams = new URLSearchParams(this.params());
      if (urlParams.has('child_category_id')) {
        urlParams.delete('parent_category_id');
      }
      return urlParams.toString();
    },
    stream: ({ params }) => this.productsService.searchProduct(params),
  });

  readonly products = computed(() => this.searchResponse.value().products);
  readonly totalProducts = computed(() => this.searchResponse.value().total);
  readonly limit = computed(() => Number(this.params()['limit']) || 12);
  readonly offset = computed(() => Number(this.params()['offset']) || 0);
  readonly currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  readonly totalPages = computed(() => Math.ceil(this.totalProducts() / this.limit()));
  readonly showingFrom = computed(() => Math.min(this.offset() + 1, this.totalProducts()));
  readonly showingTo = computed(() => Math.min(this.offset() + this.limit(), this.totalProducts()));

  readonly facets = rxResource({
    defaultValue: { brands: [], colors: [], categories: [] } as ProductFacets,
    params: () => {
      const urlParams = new URLSearchParams(this.params());

      urlParams.delete('sort_by');
      urlParams.delete('offset');
      urlParams.delete('limit');

      return urlParams.toString();
    },
    stream: ({ params }) => this.productsService.getFacets(params),
  });

  readonly categoryTree = rxResource({
    defaultValue: [] as CategoryTreeNode[],
    stream: () => this.categoriesService.getCategoryTree().pipe(map((res) => res.categories)),
  });

  readonly selectedParentId = computed(() => {
    const parentParam = this.params()['parent_category_id'];
    if (parentParam) return parentParam;

    const childParam = this.params()['child_category_id'];
    if (!childParam) return null;

    const firstChildId = childParam.split(',')[0];
    const parents = this.categoryTree.value();
    const parent = parents.find((p) => p.children.some((c) => '' + c.id === firstChildId));
    return parent ? '' + parent.id : null;
  });

  readonly filteredBrands = computed(() => {
    const search = this.brandSearch().toLowerCase();
    const brands = this.facets.value().brands;

    if (!search) {
      return brands;
    }

    return brands.filter((brand) => brand.name.toLowerCase().includes(search));
  });

  readonly filteredCategories = computed(() => {
    const search = this.categorySearch().toLowerCase();
    const categories = this.facets.value().categories.filter((cat) => cat.parent_id);

    if (!search) {
      return categories;
    }

    return categories.filter((category) => category.name.toLowerCase().includes(search));
  });

  setParam(key: string, value: string | undefined, debounce = 0): void {
    if (debounce > 0) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = window.setTimeout(() => {
        this.updateParam(key, value);
      }, debounce);
    } else {
      this.updateParam(key, value);
    }
  }

  private readonly paginationKeys = new Set(['offset', 'limit', 'sort_by']);

  private updateParam(key: string, value: string | undefined): void {
    const queryParams: Record<string, string | number | undefined> = { [key]: value };

    if (!this.paginationKeys.has(key)) {
      queryParams['offset'] = undefined;
    }

    if (key === 'parent_category_id') {
      queryParams['child_category_id'] = undefined;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  toggleParam(key: string, value: string, checked: boolean): void {
    const current = this.params()[key] as string | undefined;
    const values = current ? current.split(',') : [];

    const updated = checked ? [...values, value] : values.filter((v: string) => v !== value);
    this.setParam(key, updated.length ? updated.join(',') : undefined);
  }

  hasValue(key: string, value: string): boolean {
    const current = this.params()[key] as string | undefined;
    return current ? current.split(',').includes(value) : false;
  }

  clearAll(): void {
    const query = this.params()['query'];
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: query ? { query } : undefined,
    });
  }

  onPageChange(page: number): void {
    const offset = (page - 1) * this.limit();
    this.updateParams({ offset, limit: this.limit() });
  }

  onLimitChangeValue(value: string): void {
    this.updateParams({ limit: value || '12', offset: 0 });
  }

  private updateParams(params: Record<string, string | number | undefined>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
