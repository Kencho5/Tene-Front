import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { Order, OrderItem } from '@core/interfaces/products.interface';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import { SharedModule } from '@shared/shared.module';
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

  readonly searchQuery = signal(
    (this.route.snapshot.queryParams['search'] as string) ?? '',
  );

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

  readonly searchResponse = rxResource({
    defaultValue: { orders: [], total: 0, total_amount: 0, limit: 0, offset: 0 },
    params: () => {
      const p = { ...this.params() };
      if (!p['status']) p['status'] = 'approved';
      if (p['status'] === 'all') delete p['status'];
      return new URLSearchParams(p).toString();
    },
    stream: ({ params }) => this.adminService.searchOrders(params),
  });

  readonly isExporting = signal(false);

  readonly orders = computed(() => this.searchResponse.value().orders);
  readonly totalOrders = computed(() => this.searchResponse.value().total);
  readonly totalAmount = computed(() => this.searchResponse.value().total_amount);

  readonly fromDate = signal(
    this.toDateInput(this.route.snapshot.queryParams['from_date'] as string),
  );
  readonly toDate = signal(
    this.toDateInput(this.route.snapshot.queryParams['to_date'] as string),
  );
  readonly currentPage = computed(() => {
    const offset = Number(this.params()['offset']) || 0;
    const limit = Number(this.params()['limit']) || 12;
    return Math.floor(offset / limit) + 1;
  });
  readonly totalPages = computed(() => {
    const limit = Number(this.params()['limit']) || 12;
    return Math.ceil(this.totalOrders() / limit);
  });
  readonly limit = computed(() => Number(this.params()['limit']) || 12);
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

  formatTotalAmount(amount: number): string {
    return Math.round(amount / 100).toLocaleString('ka-GE');
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ka-GE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  statusLabel(status: string): string {
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
      this.updateQueryParams({
        search: value.trim() || undefined,
        offset: 0,
      });
    }, 400);
  }

  onStatusChange(value: string | undefined): void {
    this.updateQueryParams({ status: value ?? 'approved', offset: 0 });
  }

  onFromDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.fromDate.set(value);
    this.updateQueryParams({
      from_date: value ? `${value}T00:00:00Z` : undefined,
      offset: 0,
    });
  }

  onToDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.toDate.set(value);
    this.updateQueryParams({
      to_date: value ? `${value}T23:59:59Z` : undefined,
      offset: 0,
    });
  }

  clearDates(): void {
    this.fromDate.set('');
    this.toDate.set('');
    this.updateQueryParams({
      from_date: undefined,
      to_date: undefined,
      offset: 0,
    });
  }

  private toDateInput(value: string | undefined): string {
    return value ? value.slice(0, 10) : '';
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.updateQueryParams({ search: undefined, offset: 0 });
  }

  onPageChange(page: number): void {
    const offset = (page - 1) * this.limit();
    this.updateQueryParams({ offset, limit: this.limit() });
  }

  onLimitChangeValue(value: string): void {
    this.updateQueryParams({ limit: value || '12', offset: 0 });
  }

  exportToExcel(): void {
    if (this.isExporting()) return;
    this.isExporting.set(true);

    const p = { ...this.params() };
    if (!p['status']) p['status'] = 'approved';
    if (p['status'] === 'all') delete p['status'];
    delete p['limit'];
    delete p['offset'];
    const params = new URLSearchParams(p).toString();

    this.adminService.exportOrders(params).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'orders.xlsx';
        a.click();
        URL.revokeObjectURL(url);
        this.isExporting.set(false);
      },
      error: () => this.isExporting.set(false),
    });
  }

  openOrder(order: Order): void {
    this.router.navigate(['/admin/orders', order.id]);
  }

  customerLabel(type: string): string {
    return type === 'company' ? 'იურიდიული პირი' : 'ფიზიკური პირი';
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
