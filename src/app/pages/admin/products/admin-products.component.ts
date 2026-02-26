import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import { SharedModule } from '@shared/shared.module';
import { catchError, finalize, map, of, tap } from 'rxjs';
import { ProductResponse, ProductSearchResponse } from '@core/interfaces/products.interface';
import { generateProductSlug } from '@utils/slug';
import { getProductImageUrl } from '@utils/product-image-url';
import { AdminService } from '@core/services/admin/admin.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-admin-products',
  imports: [SharedModule, DropdownComponent, ConfirmationModalComponent, PaginationComponent],
  templateUrl: './admin-products.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProductsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  private debounceTimer?: number;

  readonly searchQuery = signal<string>('');
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly productToDelete = signal<number | null>(null);

  readonly sortOptions: ComboboxItems[] = [
    { label: 'ფასი: კლებადობით', value: 'price_desc' },
    { label: 'ფასი: ზრდადობით', value: 'price_asc' },
  ];

  readonly statusOptions: ComboboxItems[] = [
    { label: 'ყველა', value: 'all' },
    { label: 'აქტიური', value: 'enabled' },
    { label: 'გამორთული', value: 'disabled' },
  ];

  readonly params = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });

  readonly searchResponse = rxResource({
    defaultValue: { products: [], total: 0, limit: 0, offset: 0 } as ProductSearchResponse,
    params: () => new URLSearchParams(this.params()).toString(),
    stream: ({ params }) => this.adminService.searchProduct(params),
  });

  readonly products = computed(() => this.searchResponse.value().products);
  readonly totalProducts = computed(() => this.searchResponse.value().total);
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
    return getProductImageUrl(product.data.id, primaryImage.image_uuid, primaryImage.extension);
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
        query: isNumeric ? undefined : value || undefined,
        id: isNumeric ? value : undefined,
      });
    }, 400);
  }

  onSortChange(value: string | undefined): void {
    this.updateQueryParams({ sort_by: value });
  }

  onStatusChange(value: string | undefined): void {
    if (value === 'all' || !value) {
      this.updateQueryParams({ enabled: undefined });
    } else {
      this.updateQueryParams({
        enabled: value === 'enabled' ? 'true' : 'false',
      });
    }
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

  openDeleteModal(productId: number): void {
    this.productToDelete.set(productId);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.productToDelete.set(null);
  }

  confirmDelete(): void {
    const productId = this.productToDelete();
    if (productId === null) return;

    let toastParams: [string, string, number, 'success' | 'error'] | null = null;

    this.adminService
      .deleteProduct(productId)
      .pipe(
        tap(() => {
          toastParams = ['წარმატება', 'პროდუქტი წარმატებით წაიშალა', 3000, 'success'];
          this.updateQueryParams({ _t: Date.now() });
        }),
        catchError((error) => {
          toastParams = ['შეცდომა', error.error.message, 3000, 'error'];
          return of(null);
        }),
        finalize(() => {
          if (toastParams) {
            this.toastService.add(...toastParams);
          }
          this.closeDeleteModal();
        }),
      )
      .subscribe();
  }

  onPageChange(page: number): void {
    const offset = (page - 1) * this.limit();
    this.updateQueryParams({ offset, limit: this.limit() });
  }

  onLimitChangeValue(value: string): void {
    this.updateQueryParams({ limit: value || '10', offset: 0 });
  }

  toggleProductStatus(productId: number, currentStatus: boolean): void {
    let toastParams: [string, string, number, 'success' | 'error'] | null = null;

    this.adminService
      .updateProduct(productId, { enabled: !currentStatus } as any)
      .pipe(
        tap(() => {
          toastParams = [
            'წარმატება',
            currentStatus ? 'პროდუქტი გამორთულია' : 'პროდუქტი ჩართულია',
            3000,
            'success',
          ];
          this.updateQueryParams({ _t: Date.now() });
        }),
        catchError((error) => {
          toastParams = ['შეცდომა', error.error.message, 3000, 'error'];
          return of(null);
        }),
        finalize(() => {
          if (toastParams) {
            this.toastService.add(...toastParams);
          }
        }),
      )
      .subscribe();
  }
}
