import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { Order, OrderItem, OrderStatus } from '@core/interfaces/products.interface';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import {
  LightboxComponent,
  LightboxImage,
} from '@shared/components/ui/lightbox/lightbox.component';
import { SharedModule } from '@shared/shared.module';
import { getProductImageUrl } from '@utils/product-image-url';
import { generateProductSlug } from '@utils/slug';
import { OrderCommentImage } from '@core/interfaces/products.interface';
import { AdminService } from '@core/services/admin/admin.service';
import { AuthService } from '@core/services/auth/auth-service.service';

@Component({
  selector: 'app-admin-orders',
  imports: [SharedModule, DropdownComponent, PaginationComponent, LightboxComponent],
  templateUrl: './admin-orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrdersComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);
  private debounceTimer?: number;

  readonly searchQuery = signal((this.route.snapshot.queryParams['search'] as string) ?? '');

  readonly statusOptions: ComboboxItems[] = [
    { label: 'ყველა', value: 'all' },
    { label: 'დადასტურებული', value: 'approved' },
    { label: 'მოლოდინში', value: 'pending' },
    { label: 'მუშავდება', value: 'processing' },
    { label: 'უარყოფილი', value: 'declined' },
    { label: 'ვადაგასული', value: 'expired' },
    { label: 'მომზადებულია', value: 'prepared' },
    { label: 'გაგზავნილია', value: 'shipped' },
    { label: 'ფინანში გატარებულია', value: 'finance_cleared' },
  ];

  readonly orderStatusOptions: ComboboxItems[] = this.statusOptions.filter(
    (o) => o.value !== 'all',
  );

  readonly updatingStatus = signal<ReadonlySet<number>>(new Set());

  private readonly statusOverrides = signal<Record<number, OrderStatus>>({});

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

  readonly orders = computed(() => {
    const overrides = this.statusOverrides();
    return this.searchResponse
      .value()
      .orders.map((order) =>
        overrides[order.id] ? { ...order, status: overrides[order.id] } : order,
      );
  });
  readonly totalOrders = computed(() => this.searchResponse.value().total);
  readonly totalAmount = computed(() => this.searchResponse.value().total_amount);

  readonly fromDate = signal(
    this.toDateInput(this.route.snapshot.queryParams['from_date'] as string),
  );
  readonly toDate = signal(this.toDateInput(this.route.snapshot.queryParams['to_date'] as string));
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

  readonly showingFrom = computed(() => Math.min(this.offset() + 1, this.totalOrders()));

  readonly showingTo = computed(() => Math.min(this.offset() + this.limit(), this.totalOrders()));

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
      case 'prepared':
        return 'მომზადებულია';
      case 'shipped':
        return 'გაგზავნილია';
      case 'finance_cleared':
        return 'ფინანში გატარებულია';
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
        search: this.normalizeSearch(value) || undefined,
        offset: 0,
      });
    }, 400);
  }

  private normalizeSearch(value: string): string {
    const trimmed = value.trim();
    if (/^[+\d][\d\s]*$/.test(trimmed)) {
      return trimmed.replace(/\s+/g, '').replace(/^\+?995/, '');
    }
    return trimmed;
  }

  onStatusChange(value: string | undefined): void {
    this.updateQueryParams({ status: value ?? 'approved', offset: 0 });
  }

  isUpdatingStatus(orderId: number): boolean {
    return this.updatingStatus().has(orderId);
  }

  isStatusLocked(order: Order): boolean {
    return (
      this.authService.isOperator() && (order.status === 'expired' || order.status === 'pending')
    );
  }

  onOrderStatusChange(order: Order, status: string | undefined): void {
    if (
      !status ||
      status === order.status ||
      this.isUpdatingStatus(order.id) ||
      this.isStatusLocked(order)
    ) {
      return;
    }

    this.updatingStatus.update((set) => new Set(set).add(order.id));

    this.adminService.updateOrderStatus(order.id, status).subscribe({
      next: (updated) => {
        this.statusOverrides.update((m) => ({
          ...m,
          [order.id]: updated.status,
        }));
        this.clearUpdating(order.id);
      },
      error: () => this.clearUpdating(order.id),
    });
  }

  private clearUpdating(orderId: number): void {
    this.updatingStatus.update((set) => {
      const next = new Set(set);
      next.delete(orderId);
      return next;
    });
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

  readonly datePresets: ComboboxItems[] = [
    { label: 'დღეს', value: 'today' },
    { label: 'გუშინ', value: 'yesterday' },
    { label: 'გუშინწინ', value: 'day_before' },
    { label: '7 დღის', value: 'last_7' },
    { label: '10 დღის', value: 'last_10' },
    { label: 'ამ თვის', value: 'this_month' },
    { label: 'წინა თვის', value: 'last_month' },
  ];

  readonly selectedPreset = signal('');

  private localDateInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  selectPreset(value: string | undefined): void {
    if (!value) return;
    this.selectedPreset.set(value);

    const today = new Date();
    let from = new Date();
    let to = new Date();

    switch (value) {
      case 'today':
        break;
      case 'yesterday':
        from.setDate(today.getDate() - 1);
        to.setDate(today.getDate() - 1);
        break;
      case 'day_before':
        from.setDate(today.getDate() - 2);
        to.setDate(today.getDate() - 2);
        break;
      case 'last_7':
        from.setDate(today.getDate() - 7);
        break;
      case 'last_10':
        from.setDate(today.getDate() - 10);
        break;
      case 'this_month':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last_month':
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      default:
        return;
    }

    const fromStr = this.localDateInput(from);
    const toStr = this.localDateInput(to);

    this.fromDate.set(fromStr);
    this.toDate.set(toStr);
    this.updateQueryParams({
      from_date: `${fromStr}T00:00:00Z`,
      to_date: `${toStr}T23:59:59Z`,
      offset: 0,
    });
  }

  clearDates(): void {
    this.fromDate.set('');
    this.toDate.set('');
    this.selectedPreset.set('');
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

  readonly expandedId = signal<number | null>(null);

  readonly lightboxOpen = signal(false);
  readonly lightboxImages = signal<LightboxImage[]>([]);
  readonly lightboxActiveId = signal<string | null>(null);

  toggleOrder(order: Order): void {
    this.expandedId.update((id) => (id === order.id ? null : order.id));
  }

  isExpanded(orderId: number): boolean {
    return this.expandedId() === orderId;
  }

  subtotal(order: Order): number {
    return order.items.reduce(
      (sum, item) => sum + Number(item.price_at_purchase) * item.quantity,
      0,
    );
  }

  formatItemAmount(amount: number | string): string {
    return Number(amount).toFixed(2);
  }

  getProductRoute(item: OrderItem): string {
    return `/products/${generateProductSlug(item.product_name)}/${item.product_id}`;
  }

  customerLabel(type: string): string {
    return type === 'company' ? 'იურიდიული პირი' : 'ფიზიკური პირი';
  }

  deliveryTypeLabel(type: string): string {
    switch (type) {
      case 'delivery':
        return 'მიტანა';
      case 'pickup':
        return 'გატანა';
      default:
        return type;
    }
  }

  deliveryTimeLabel(time: string): string {
    switch (time) {
      case 'same_day':
        return 'იმავე დღეს';
      case 'next_day':
        return 'მეორე დღეს';
      default:
        return time;
    }
  }

  openCommentImages(images: OrderCommentImage[], activeId: string): void {
    this.lightboxImages.set(
      images.map((image) => ({
        id: image.image_uuid,
        src: image.url,
        alt: 'კომენტარის სურათი',
      })),
    );
    this.lightboxActiveId.set(activeId);
    this.lightboxOpen.set(true);
  }

  closeCommentImages(): void {
    this.lightboxOpen.set(false);
  }

  onCommentImageChange(imageId: string): void {
    this.lightboxActiveId.set(imageId);
  }

  private updateQueryParams(params: Record<string, string | number | undefined>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
