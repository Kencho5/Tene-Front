import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SharedModule } from '@shared/shared.module';
import { AdminService } from '@core/services/admin/admin.service';
import { ProductsService } from '@core/services/products/products.service';
import { ToastService } from '@core/services/toast.service';
import { ProductResponse } from '@core/interfaces/products.interface';
import { getProductImageUrl } from '@utils/product-image-url';
import { catchError, finalize, of, tap } from 'rxjs';

@Component({
  selector: 'app-admin-top-products',
  imports: [SharedModule],
  templateUrl: './admin-top-products.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTopProductsComponent {
  private readonly adminService = inject(AdminService);
  private readonly productsService = inject(ProductsService);
  private readonly toastService = inject(ToastService);
  private searchTimer?: number;

  readonly searchQuery = signal<string>('');
  readonly searchTerm = signal<string>('');
  readonly selected = signal<ProductResponse[]>([]);
  readonly saving = signal<boolean>(false);
  readonly initialIds = signal<string[]>([]);

  readonly topResource = rxResource({
    defaultValue: [] as ProductResponse[],
    stream: () => this.adminService.getTopProducts(),
  });

  private seeded = false;
  constructor() {
    effect(() => {
      const v = this.topResource.value();
      if (this.topResource.isLoading()) return;
      if (this.seeded) return;
      this.seeded = true;
      this.selected.set(v);
      this.initialIds.set(v.map((p) => p.data.id));
    });
  }

  readonly searchResource = rxResource({
    defaultValue: { products: [], total: 0, limit: 0, offset: 0 } as any,
    params: () => this.searchTerm(),
    stream: ({ params }) => {
      if (!params) return of({ products: [], total: 0, limit: 0, offset: 0 } as any);
      const isId = /^[a-zA-Z0-9_-]{8,}$/.test(params) && !/\s/.test(params);
      const qs = isId
        ? `id=${encodeURIComponent(params)}&limit=10`
        : `query=${encodeURIComponent(params)}&limit=10`;
      return this.adminService.searchProduct(qs);
    },
  });

  readonly searchResults = computed<ProductResponse[]>(() => {
    const all: ProductResponse[] = this.searchResource.value()?.products ?? [];
    const selectedIds = new Set(this.selected().map((p) => p.data.id));
    return all.filter((p) => !selectedIds.has(p.data.id));
  });

  readonly isDirty = computed(() => {
    const current = this.selected().map((p) => p.data.id);
    const initial = this.initialIds();
    if (current.length !== initial.length) return true;
    return current.some((id, i) => id !== initial[i]);
  });

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = window.setTimeout(() => {
      this.searchTerm.set(value.trim());
    }, 350);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchTerm.set('');
  }

  syncFromResource(): void {
    const v = this.topResource.value();
    this.selected.set(v);
    this.initialIds.set(v.map((p) => p.data.id));
  }

  addProduct(product: ProductResponse): void {
    this.selected.update((list) => [...list, product]);
  }

  removeProduct(productId: string): void {
    this.selected.update((list) => list.filter((p) => p.data.id !== productId));
  }

  moveUp(index: number): void {
    if (index <= 0) return;
    this.selected.update((list) => {
      const copy = [...list];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  }

  moveDown(index: number): void {
    this.selected.update((list) => {
      if (index >= list.length - 1) return list;
      const copy = [...list];
      [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]];
      return copy;
    });
  }

  reset(): void {
    this.syncFromResource();
  }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    const ids = this.selected().map((p) => p.data.id);
    let toastParams: [string, string, number, 'success' | 'error'] | null = null;

    this.adminService
      .updateTopProducts(ids)
      .pipe(
        tap(() => {
          toastParams = ['წარმატება', 'ტოპ პროდუქტები განახლდა', 3000, 'success'];
          this.initialIds.set(ids);
          this.topResource.reload();
        }),
        catchError((err) => {
          toastParams = [
            'შეცდომა',
            err?.error?.message || 'შენახვა ვერ მოხერხდა',
            4000,
            'error',
          ];
          return of(null);
        }),
        finalize(() => {
          this.saving.set(false);
          if (toastParams) this.toastService.add(...toastParams);
        }),
      )
      .subscribe();
  }

  getImage(product: ProductResponse): string {
    const primary = product.images.find((i) => i.is_primary) ?? product.images[0];
    if (!primary) return '';
    return getProductImageUrl(product.data.id, primary.image_uuid, primary.extension);
  }
}
