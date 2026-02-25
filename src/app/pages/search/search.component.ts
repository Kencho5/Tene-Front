import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { ProductsService } from '@core/services/products/products.service';
import { CategoriesService } from '@core/services/categories/categories.service';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '@shared/components/ui/breadcrumb/breadcrumb.component';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { ComboboxComponent } from '@shared/components/ui/combobox/combobox.component';
import { ProductCardComponent } from '@shared/components/ui/product-card/product-card.component';
import { ProductCardSkeletonComponent } from '@shared/components/ui/product-card-skeleton/product-card-skeleton.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import { SharedModule } from '@shared/shared.module';
import {
  catchError,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { ProductFacets } from '@core/interfaces/products.interface';
import { flattenCategoryTree } from '@utils/category';
import { getColorLabel } from '@utils/colors';

@Component({
  selector: 'app-search',
  imports: [
    SharedModule,
    DropdownComponent,
    ComboboxComponent,
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
  private readonly categoriesService = inject(CategoriesService);
  private debounceTimer?: number;

  readonly getColorLabel = getColorLabel;

  readonly params = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });
  readonly isFilterOpen = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly isFacetsLoading = signal<boolean>(false);
  readonly brandSearch = signal<string>('');
  readonly showAllBrands = signal(false);
  readonly showAllColors = signal(false);
  readonly selectedCategoryValue = signal<string | undefined>(undefined);

  readonly categoryOptions = toSignal(
    this.categoriesService.getCategoryTree().pipe(
      map((response) => flattenCategoryTree(response.categories)),
      catchError(() => of([])),
    ),
    { initialValue: [] },
  );

  readonly breadcrumbItems: BreadcrumbItem[] = [
    { label: 'მთავარი', route: '/' },
    { label: 'პროდუქტები' },
  ];

  readonly sortOptions: ComboboxItems[] = [
    { label: 'ფასი: კლებადობით', value: 'price_desc' },
    { label: 'ფასი: ზრდადობით', value: 'price_asc' },
  ];

  readonly searchResponse = toSignal(
    this.route.queryParams.pipe(
      tap(() => {
        this.isLoading.set(true);
      }),
      map((params) => new URLSearchParams(params).toString()),
      switchMap((query) =>
        this.productsService.searchProduct(query).pipe(
          map((response) => {
            return response;
          }),
          catchError(() => of({ products: [], total: 0, limit: 0, offset: 0 })),
        ),
      ),
      tap(() => {
        this.isLoading.set(false);
      }),
    ),
    { initialValue: { products: [], total: 0, limit: 0, offset: 0 } },
  );

  readonly products = computed(() => this.searchResponse().products);
  readonly totalProducts = computed(() => this.searchResponse().total);
  readonly limit = computed(() => Number(this.params()['limit']) || 15);
  readonly offset = computed(() => Number(this.params()['offset']) || 0);
  readonly currentPage = computed(() =>
    Math.floor(this.offset() / this.limit()) + 1,
  );
  readonly totalPages = computed(() =>
    Math.ceil(this.totalProducts() / this.limit()),
  );
  readonly showingFrom = computed(() =>
    Math.min(this.offset() + 1, this.totalProducts()),
  );
  readonly showingTo = computed(() =>
    Math.min(this.offset() + this.limit(), this.totalProducts()),
  );

  readonly facets = toSignal(
    this.route.queryParams.pipe(
      map((params) => {
        const urlParams = new URLSearchParams(params);
        const searchParams = new URLSearchParams();

        if (urlParams.has('query'))
          searchParams.set('query', urlParams.get('query')!);
        if (urlParams.has('product_type'))
          searchParams.set('product_type', urlParams.get('product_type')!);
        if (urlParams.has('price_from'))
          searchParams.set('price_from', urlParams.get('price_from')!);
        if (urlParams.has('price_to'))
          searchParams.set('price_to', urlParams.get('price_to')!);

        return searchParams.toString();
      }),
      distinctUntilChanged(),
      tap(() => this.isFacetsLoading.set(true)),
      switchMap((query) =>
        this.productsService
          .getFacets(query)
          .pipe(
            catchError(
              () =>
                of({
                  brands: [],
                  colors: [],
                  categories: [],
                } as ProductFacets),
            ),
          ),
      ),
      tap(() => this.isFacetsLoading.set(false)),
    ),
    {
      initialValue: {
        brands: [],
        colors: [],
        categories: [],
      } as ProductFacets,
    },
  );

  readonly filteredBrands = computed(() => {
    const search = this.brandSearch().toLowerCase();
    const brands = this.facets().brands;

    if (!search) {
      return brands;
    }

    return brands.filter((brand) =>
      brand.name.toLowerCase().includes(search),
    );
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
    const updated = checked
      ? [...values, value]
      : values.filter((v: string) => v !== value);

    this.setParam(key, updated.length ? updated.join(',') : undefined);
  }

  hasValue(key: string, value: string): boolean {
    const current = this.params()[key] as string | undefined;
    return current ? current.split(',').includes(value) : false;
  }

  onCategorySelectionChange(categoryId: string | undefined): void {
    this.setParam('category_id', categoryId);
  }

  getSelectedCategoryValue(): string | undefined {
    const params = this.params();
    const categoryId = params['category_id'];

    if (!categoryId) return undefined;

    const options = this.categoryOptions();
    const option = options.find((opt) => opt.value.split(':')[1] === categoryId);
    return option?.value;
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

  private updateParams(
    params: Record<string, string | number | undefined>,
  ): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
