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
import { OrderItem } from '@core/interfaces/products.interface';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import { SharedModule } from '@shared/shared.module';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { getProductImageUrl } from '@utils/product-image-url';
import { AdminService } from '@core/services/admin/admin.service';

@Component({
  selector: 'app-admin-orders',
  imports: [SharedModule, DropdownComponent, PaginationComponent],
  templateUrl: './admin-orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrdersComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private debounceTimer?: number;

  readonly isLoading = signal(false);
  readonly searchQuery = signal('');

  readonly statusOptions: ComboboxItems[] = [
    { label: 'ყველა', value: 'all' },
    { label: 'დადასტურებული', value: 'approved' },
    { label: 'მოლოდინში', value: 'pending' },
    { label: 'მუშავდება', value: 'processing' },
    { label: 'უარყოფილი', value: 'declined' },
    { label: 'ვადაგასული', value: 'expired' },
  ];

  readonly params = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });

  readonly searchResponse = toSignal(
    this.route.queryParams.pipe(
      tap(() => this.isLoading.set(true)),
      map((params) => new URLSearchParams(params).toString()),
      switchMap((query) =>
        this.adminService.searchOrders(query).pipe(
          catchError(() => of({ orders: [], total: 0, limit: 0, offset: 0 })),
        ),
      ),
      tap(() => this.isLoading.set(false)),
    ),
    { initialValue: { orders: [], total: 0, limit: 0, offset: 0 } },
  );

  readonly orders = computed(() => this.searchResponse().orders);
  readonly totalOrders = computed(() => this.searchResponse().total);
  readonly currentPage = computed(() => {
    const offset = Number(this.params()['offset']) || 0;
    const limit = Number(this.params()['limit']) || 10;
    return Math.floor(offset / limit) + 1;
  });
  readonly totalPages = computed(() => {
    const limit = Number(this.params()['limit']) || 10;
    return Math.ceil(this.totalOrders() / limit);
  });
  readonly limit = computed(() => Number(this.params()['limit']) || 10);
  readonly offset = computed(() => Number(this.params()['offset']) || 0);

  readonly showingFrom = computed(() =>
    Math.min(this.offset() + 1, this.totalOrders()),
  );

  readonly showingTo = computed(() =>
    Math.min(this.offset() + this.limit(), this.totalOrders()),
  );

  getItemImageUrl(item: OrderItem): string | null {
    if (!item.product_image) return null;
    return getProductImageUrl(
      item.product_id,
      item.product_image.image_uuid,
      item.product_image.extension,
    );
  }

  formatAmount(amount: number): string {
    return (amount / 100).toFixed(2);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  statusLabel(
    status: string,
  ): string {
    switch (status) {
      case 'approved':
        return 'დადასტურებული';
      case 'pending':
        return 'მოლოდინში';
      case 'processing':
        return 'მუშავდება';
      case 'declined':
        return 'უარყოფილი';
      case 'expired':
        return 'ვადაგასული';
      default:
        return status;
    }
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);

    clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      const isNumeric = /^\d+$/.test(value);
      this.updateQueryParams({
        id: isNumeric ? value : undefined,
        user_id: undefined,
        offset: 0,
      });
    }, 400);
  }

  onStatusChange(value: string | undefined): void {
    if (value === 'all' || !value) {
      this.updateQueryParams({ status: undefined, offset: 0 });
    } else {
      this.updateQueryParams({ status: value, offset: 0 });
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.updateQueryParams({ id: undefined, offset: 0 });
  }

  onPageChange(page: number): void {
    const offset = (page - 1) * this.limit();
    this.updateQueryParams({ offset, limit: this.limit() });
  }

  onLimitChangeValue(value: string): void {
    this.updateQueryParams({ limit: value || '10', offset: 0 });
  }

  private updateQueryParams(
    params: Record<string, string | number | undefined>,
  ): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
