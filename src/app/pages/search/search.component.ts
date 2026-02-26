import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { ProductsService } from '@core/services/products/products.service';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '@shared/components/ui/breadcrumb/breadcrumb.component';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { ProductCardComponent } from '@shared/components/ui/product-card/product-card.component';
import { ProductCardSkeletonComponent } from '@shared/components/ui/product-card-skeleton/product-card-skeleton.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import { SharedModule } from '@shared/shared.module';
import { ProductFacets, ProductSearchResponse } from '@core/interfaces/products.interface';
import { getColorLabel } from '@utils/colors';

@Component({
  selector: 'app-search',
  imports: [
    SharedModule,
    DropdownComponent,
    BreadcrumbComponent,
    ProductCardComponent,
    ProductCardSkeletonComponent,
    PaginationComponent,
  ],
  templateUrl: './search.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productsService = inject(ProductsService);
  private debounceTimer?: number;

  readonly getColorLabel = getColorLabel;

  readonly params = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });
  readonly isFilterOpen = signal<boolean>(false);
  readonly brandSearch = signal<string>('');
  readonly categorySearch = signal<string>('');
  readonly showAllBrands = signal(false);
  readonly showAllColors = signal(false);
  readonly showAllCategories = signal(false);

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'მთავარი', route: '/' },
    { label: 'პროდუქტები' },
  ];

  readonly sortOptions: ComboboxItems[] = [
    { label: 'ფასი: კლებადობით', value: 'price_desc' },
    { label: 'ფასი: ზრდადობით', value: 'price_asc' },
  ];

  readonly searchResponse = rxResource({
    defaultValue: { products: [], total: 0, limit: 0, offset: 0 } as ProductSearchResponse,
    params: () => new URLSearchParams(this.params()).toString(),
    stream: ({ params }) => this.productsService.searchProduct(params),
  });

  readonly products = computed(() => this.searchResponse.value().products);
  readonly totalProducts = computed(() => this.searchResponse.value().total);
  readonly limit = computed(() => Number(this.params()['limit']) || 15);
  readonly offset = computed(() => Number(this.params()['offset']) || 0);
  readonly currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  readonly totalPages = computed(() => Math.ceil(this.totalProducts() / this.limit()));
  readonly showingFrom = computed(() => Math.min(this.offset() + 1, this.totalProducts()));
  readonly showingTo = computed(() => Math.min(this.offset() + this.limit(), this.totalProducts()));

  readonly facets = rxResource({
    defaultValue: { brands: [], colors: [], categories: [] } as ProductFacets,
    params: () => {
      const urlParams = new URLSearchParams(this.params());
      urlParams.delete('brand');
      urlParams.delete('color');
      return urlParams.toString();
    },
    stream: ({ params }) => this.productsService.getFacets(params),
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
    const categories = this.facets.value().categories;

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

  private updateParam(key: string, value: string | undefined): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [key]: value },
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
    this.router.navigate([], { relativeTo: this.route });
  }

  onPageChange(page: number): void {
    const offset = (page - 1) * this.limit();
    this.updateParams({ offset, limit: this.limit() });
  }

  onLimitChangeValue(value: string): void {
    this.updateParams({ limit: value || '15', offset: 0 });
  }

  private updateParams(params: Record<string, string | number | undefined>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
