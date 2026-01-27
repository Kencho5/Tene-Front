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
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { SharedModule } from '@shared/shared.module';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { ProductResponse } from '@core/interfaces/products.interface';
import { generateProductSlug } from '@utils/slug';
import { getProductImageUrl } from '@utils/product-image-url';

@Component({
  selector: 'app-admin-products',
  imports: [SharedModule, DropdownComponent],
  templateUrl: './admin-products.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProductsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productsService = inject(ProductsService);
  private debounceTimer?: number;

  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');

  readonly sortOptions: ComboboxItems[] = [
    { label: 'ფასი: კლებადობით', value: 'price_desc' },
    { label: 'ფასი: ზრდადობით', value: 'price_asc' },
  ];

  readonly limitOptions: ComboboxItems[] = [
    { label: '10', value: '10' },
    { label: '20', value: '20' },
    { label: '50', value: '50' },
    { label: '100', value: '100' },
  ];

  readonly params = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });

  readonly searchResponse = toSignal(
    this.route.queryParams.pipe(
      tap(() => this.isLoading.set(true)),
      map((params) => new URLSearchParams(params).toString()),
      switchMap((query) =>
        this.productsService
          .searchProduct(query)
          .pipe(
            catchError(() =>
              of({ products: [], total: 0, limit: 0, offset: 0 }),
            ),
          ),
      ),
      tap(() => this.isLoading.set(false)),
    ),
    { initialValue: { products: [], total: 0, limit: 0, offset: 0 } },
  );

  readonly products = computed(() => this.searchResponse().products);
  readonly totalProducts = computed(() => this.searchResponse().total);
  readonly currentPage = computed(() => {
    const offset = Number(this.params()['offset']) || 0;
    const limit = Number(this.params()['limit']) || 10;
    return Math.floor(offset / limit) + 1;
  });
  readonly totalPages = computed(() => {
    const limit = Number(this.params()['limit']) || 10;
    return Math.ceil(this.totalProducts() / limit);
  });
  readonly limit = computed(() => Number(this.params()['limit']) || 10);
  readonly offset = computed(() => Number(this.params()['offset']) || 0);

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, -1, total];
    }

    if (current >= total - 3) {
      return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
    }

    return [1, -1, current - 1, current, current + 1, -1, total];
  });

  readonly showingFrom = computed(() => {
    const offset = this.offset();
    return Math.min(offset + 1, this.totalProducts());
  });

  readonly showingTo = computed(() => {
    const offset = this.offset();
    const limit = this.limit();
    return Math.min(offset + limit, this.totalProducts());
  });

  getProductImage(product: ProductResponse): string {
    const primaryImage = product.images.find((image) => image.is_primary);
    if (!primaryImage) return '';
    return getProductImageUrl(product.data.id, primaryImage.image_uuid);
  }

  getProductLink(product: ProductResponse): string[] {
    const slug = generateProductSlug(product.data.name);
    return ['/products', slug, product.data.id.toString()];
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);

    clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      const isNumeric = /^\d+$/.test(value);
      this.updateQueryParams({
        query: isNumeric ? undefined : (value || undefined),
        id: isNumeric ? value : undefined,
      });
    }, 400);
  }

  onSortChange(value: string | undefined): void {
    this.updateQueryParams({ sort_by: value });
  }

  onLimitChange(value: string | undefined): void {
    this.updateQueryParams({ limit: value || '10', offset: 0 });
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.updateQueryParams({ query: undefined, id: undefined });
  }

  private updateQueryParams(params: Record<string, string | number | undefined>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  deleteProduct(productId: number): void {
    // TODO: Implement delete functionality
    console.log('Delete product', productId);
  }

  goToPage(page: number): void {
    const offset = (page - 1) * this.limit();
    this.updateQueryParams({ offset, limit: this.limit() });
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.goToPage(this.currentPage() - 1);
    }
  }
}
