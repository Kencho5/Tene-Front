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
import { environment } from '@environments/environment';
import { ProductResponse } from '@core/interfaces/products.interface';

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

  readonly params = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });

  readonly searchResponse = toSignal(
    this.route.queryParams.pipe(
      tap(() => this.isLoading.set(true)),
      map((params) => new URLSearchParams(params).toString()),
      switchMap((query) =>
        this.productsService.searchProduct(query).pipe(
          catchError(() => of({ products: [], total: 0, limit: 0, offset: 0 })),
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
    const limit = Number(this.params()['limit']) || 20;
    return Math.floor(offset / limit) + 1;
  });
  readonly totalPages = computed(() => {
    const limit = Number(this.params()['limit']) || 20;
    return Math.ceil(this.totalProducts() / limit);
  });
  readonly limit = computed(() => Number(this.params()['limit']) || 20);

  getProductImage(product: ProductResponse): string {
    const primaryImage = product.images.find((image) => image.is_primary);
    if (!primaryImage) return '';
    return `${environment.product_image_url}/products/${product.data.id}/${primaryImage.image_uuid}.jpg`;
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.setParam('query', value || undefined, 400);
  }

  onSortChange(value: string | undefined): void {
    this.setParam('sort_by', value);
  }

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

  clearSearch(): void {
    this.searchQuery.set('');
    this.setParam('query', undefined);
  }

  addProduct(): void {
    // TODO: Navigate to add product page
    console.log('Add product');
  }

  editProduct(productId: number): void {
    // TODO: Navigate to edit product page
    console.log('Edit product', productId);
  }

  deleteProduct(productId: number): void {
    // TODO: Implement delete functionality
    console.log('Delete product', productId);
  }

  goToPage(page: number): void {
    const limit = this.limit();
    const offset = (page - 1) * limit;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { offset, limit },
      queryParamsHandling: 'merge',
    });
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
