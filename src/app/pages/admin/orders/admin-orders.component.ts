import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import {
  Order,
  OrderCreator,
  OrderItem,
  OrderStatus,
} from '@core/interfaces/products.interface';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { MultiDropdownComponent } from '@shared/components/ui/multi-dropdown/multi-dropdown.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import {
  LightboxComponent,
  LightboxImage,
} from '@shared/components/ui/lightbox/lightbox.component';
import { georgianCities } from '@shared/components/address-form-modal/georgian-cities';
import {
  DELIVERY_PRICES,
  HIGH_MOUNTAIN_CITIES,
  TBILISI_REGIONS,
  tbilisiExpressPrice,
} from '@pages/checkout/checkout.config';
import { SharedModule } from '@shared/shared.module';
import { getProductImageUrl } from '@utils/product-image-url';
import { generateProductSlug } from '@utils/slug';
import { OrderCommentImage } from '@core/interfaces/products.interface';
import { AdminService } from '@core/services/admin/admin.service';
import { AuthService } from '@core/services/auth/auth-service.service';
import { ToastService } from '@core/services/toast.service';

type MultiFilterKey = 'status' | 'payment_method' | 'delivery_type' | 'fulfillment_method';

type FlagKey = 'is_fina_cleared' | 'is_installment_sale' | 'is_product_exchange';

interface FilterChip {
  key: string;
  value: string;
  label: string;
}

@Component({
  selector: 'app-admin-orders',
  imports: [
    SharedModule,
    DropdownComponent,
    MultiDropdownComponent,
    PaginationComponent,
    LightboxComponent,
  ],
  templateUrl: './admin-orders.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class AdminOrdersComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private debounceTimer?: number;

  readonly searchQuery = signal((this.route.snapshot.queryParams['search'] as string) ?? '');

  readonly orderStatusOptions: ComboboxItems[] = [
    { label: 'შექმნილი', value: 'created' },
    { label: 'დადასტურებული', value: 'approved' },
    { label: 'მოლოდინში', value: 'pending' },
    { label: 'მუშავდება', value: 'processing' },
    { label: 'უარყოფილი', value: 'declined' },
    { label: 'ვადაგასული', value: 'expired' },
    { label: 'მომზადებულია', value: 'prepared' },
    { label: 'გაგზავნილია', value: 'shipped' },
    { label: 'FINA-ში გატარებულია', value: 'finance_cleared' },
    { label: 'თანხა დაბრუნებულია', value: 'refunded' },
  ];

  readonly sourceOptions: ComboboxItems[] = [
    { label: 'საიტიდან', value: 'web' },
    { label: 'ხელით დამატებული', value: 'admin' },
  ];

  readonly paymentMethodOptions: ComboboxItems[] = [
    { label: 'ბარათით ონლაინ', value: 'card' },
    { label: 'POS — BOG', value: 'pos_bog' },
    { label: 'POS — TBC', value: 'pos_tbc' },
    { label: 'POS — Liberty', value: 'pos_liberty' },
    { label: 'ნაღდი', value: 'cash' },
    { label: 'ჩარიცხვა — საქართველოს ბანკი', value: 'transfer_bog' },
    { label: 'ჩარიცხვა — თიბისი', value: 'transfer_tbc' },
    { label: 'ჩარიცხვა — extra.ge', value: 'transfer_extra' },
    { label: 'ადგილზე გადახდა', value: 'cash_on_delivery' },
  ];

  readonly deliveryTypeOptions: ComboboxItems[] = [
    { label: 'მიტანა', value: 'delivery' },
    { label: 'გატანა', value: 'pickup' },
  ];

  readonly fulfillmentMethodOptions: ComboboxItems[] = [
    { label: 'მაღაზიიდან გატანა', value: 'store_pickup' },
    { label: 'საკურიერო მომსახურება', value: 'courier' },
  ];

  readonly flagOptions: ReadonlyArray<{ key: FlagKey; label: string }> = [
    { key: 'is_fina_cleared', label: 'გატარებულია ფინაში' },
    { key: 'is_installment_sale', label: 'გაყიდულია განვადებით' },
    { key: 'is_product_exchange', label: 'პროდუქტის შეცვლა' },
  ];

  readonly triStateOptions: ComboboxItems[] = [
    { label: 'ყველა', value: '' },
    { label: 'კი', value: 'true' },
    { label: 'არა', value: 'false' },
  ];

  readonly cityOptions: ComboboxItems[] = georgianCities.map((c) => ({
    label: c.label,
    value: c.value,
  }));

  private readonly multiFilterKeys = [
    'status',
    'payment_method',
    'delivery_type',
    'fulfillment_method',
  ] as const;

  readonly multiFilterGroups: ReadonlyArray<{
    key: MultiFilterKey;
    label: string;
    placeholder: string;
    items: ComboboxItems[];
  }> = [
    {
      key: 'status',
      label: 'სტატუსი',
      placeholder: 'ყველა სტატუსი',
      items: this.orderStatusOptions,
    },
    {
      key: 'payment_method',
      label: 'გადახდის ფორმა',
      placeholder: 'ყველა გადახდა',
      items: this.paymentMethodOptions,
    },
    {
      key: 'delivery_type',
      label: 'მიწოდება',
      placeholder: 'ყველა მიწოდება',
      items: this.deliveryTypeOptions,
    },
    {
      key: 'fulfillment_method',
      label: 'ჩაბარების მეთოდი',
      placeholder: 'ყველა მეთოდი',
      items: this.fulfillmentMethodOptions,
    },
  ];

  readonly updatingStatus = signal<ReadonlySet<number>>(new Set());
  readonly updatingFina = signal<ReadonlySet<number>>(new Set());

  readonly orderToDelete = signal<Order | null>(null);
  readonly isDeleting = signal(false);
  readonly canDelete = computed(() => this.authService.isAdmin());

  private readonly statusOverrides = signal<Record<number, OrderStatus>>({});
  private readonly finaOverrides = signal<Record<number, boolean>>({});

  readonly params = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });

  readonly searchResponse = rxResource({
    defaultValue: { orders: [], total: 0, total_amount: 0, limit: 0, offset: 0 },
    params: () => {
      const p = this.normalizedParams();
      if (!p['limit']) p['limit'] = '12';
      if (!p['offset']) p['offset'] = '0';
      return new URLSearchParams(p).toString();
    },
    stream: ({ params }) => this.adminService.searchOrders(params),
  });

  readonly isExporting = signal(false);

  private readonly creatorsRequested = signal(false);

  private readonly creatorsResponse = rxResource({
    defaultValue: [] as OrderCreator[],
    params: () => (this.creatorsRequested() && this.authService.isAdmin() ? true : undefined),
    stream: () => this.adminService.getOrderCreators(),
  });

  readonly uploadedByOptions = computed<ComboboxItems[]>(() => [
    { label: 'ყველა', value: '' },
    ...(this.creatorsResponse.hasValue() ? this.creatorsResponse.value() : []).map((creator) => ({
      label: creator.name || creator.email,
      value: String(creator.id),
    })),
  ]);

  readonly source = computed(() => (this.params()['source'] as string) ?? 'web');
  readonly isAdminSource = computed(() => this.source() === 'admin');
  readonly columnCount = computed(() => (this.isAdminSource() ? 10 : 9));

  readonly activeFilterCount = computed(() => this.filterChips().length);

  readonly filterChips = computed<FilterChip[]>(() => {
    const chips: FilterChip[] = [];

    for (const key of this.multiFilterKeys) {
      for (const value of this.csvParam(key)) {
        chips.push({ key, value, label: this.optionLabel(key, value) });
      }
    }

    for (const flag of this.flagOptions) {
      const value = (this.params()[flag.key] as string) ?? '';
      if (value === 'true' || value === 'false') {
        chips.push({
          key: flag.key,
          value,
          label: value === 'true' ? flag.label : `${flag.label}: არა`,
        });
      }
    }

    const city = (this.params()['city'] as string) ?? '';
    if (city) chips.push({ key: 'city', value: city, label: this.cityLabel(city) });

    const uploadedBy = (this.params()['created_by_user_id'] as string) ?? '';
    if (uploadedBy) {
      chips.push({
        key: 'created_by_user_id',
        value: uploadedBy,
        label: `ამტვირთველი: ${this.uploadedByLabel(uploadedBy)}`,
      });
    }

    const min = (this.params()['min_amount'] as string) ?? '';
    const max = (this.params()['max_amount'] as string) ?? '';
    if (min) chips.push({ key: 'min_amount', value: min, label: `${min} ₾-დან` });
    if (max) chips.push({ key: 'max_amount', value: max, label: `${max} ₾-მდე` });

    return chips;
  });

  private optionLabel(key: MultiFilterKey, value: string): string {
    const items: Record<MultiFilterKey, ComboboxItems[]> = {
      status: this.orderStatusOptions,
      payment_method: this.paymentMethodOptions,
      delivery_type: this.deliveryTypeOptions,
      fulfillment_method: this.fulfillmentMethodOptions,
    };
    return items[key].find((i) => i.value === value)?.label ?? value;
  }

  uploadedByLabel(userId: string): string {
    const creator = this.orders().find((o) => String(o.created_by?.id) === userId)?.created_by;
    return creator ? creator.name || creator.email : userId;
  }

  private csvParam(key: string): string[] {
    const raw = this.params()[key] as string | undefined;
    return raw ? raw.split(',').filter(Boolean) : [];
  }

  private normalizedParams(): Record<string, string> {
    const p = { ...this.params() } as Record<string, string>;
    if (!p['source']) p['source'] = 'web';
    if (p['search']) {
      delete p['from_date'];
      delete p['to_date'];
    }
    for (const key of Object.keys(p)) {
      if (!p[key]) delete p[key];
    }
    return p;
  }

  readonly orders = computed(() => {
    const overrides = this.statusOverrides();
    const finance = this.finaOverrides();
    return this.searchResponse.value().orders.map((order) => {
      const status = overrides[order.id] ?? order.status;
      const isFinaCleared = finance[order.id] ?? order.is_fina_cleared;
      return status === order.status && isFinaCleared === order.is_fina_cleared
        ? order
        : { ...order, status, is_fina_cleared: isFinaCleared };
    });
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
      case 'created':
        return 'შექმნილი';
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
        return 'FINA-ში გატარებულია';
      case 'refunded':
        return 'თანხა დაბრუნებულია';
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

  onSourceChange(value: string): void {
    if (value === this.source()) return;
    this.updateQueryParams({
      source: value,
      payment_method: undefined,
      offset: 0,
    });
  }

  readonly filtersOpen = signal(false);
  private readonly draftMulti = signal<Record<MultiFilterKey, string[]>>(this.emptyMulti());
  private readonly draftFlags = signal<Record<FlagKey, string>>(this.emptyFlags());
  readonly draftCity = signal('');
  readonly draftUploadedBy = signal('');
  readonly draftMinAmount = signal('');
  readonly draftMaxAmount = signal('');

  private emptyMulti(): Record<MultiFilterKey, string[]> {
    return {
      status: [],
      payment_method: [],
      delivery_type: [],
      fulfillment_method: [],
    };
  }

  private emptyFlags(): Record<FlagKey, string> {
    return {
      is_fina_cleared: '',
      is_installment_sale: '',
      is_product_exchange: '',
    };
  }

  openFilters(): void {
    this.creatorsRequested.set(true);
    this.syncDraftFromParams();
    this.filtersOpen.set(true);
  }

  private syncDraftFromParams(): void {
    const multi = this.emptyMulti();
    for (const key of this.multiFilterKeys) multi[key] = this.csvParam(key);
    this.draftMulti.set(multi);

    const flags = this.emptyFlags();
    for (const flag of this.flagOptions) {
      flags[flag.key] = (this.params()[flag.key] as string) ?? '';
    }
    this.draftFlags.set(flags);

    this.draftCity.set((this.params()['city'] as string) ?? '');
    this.draftUploadedBy.set((this.params()['created_by_user_id'] as string) ?? '');
    this.draftMinAmount.set((this.params()['min_amount'] as string) ?? '');
    this.draftMaxAmount.set((this.params()['max_amount'] as string) ?? '');
  }

  draftValues(key: MultiFilterKey): string[] {
    return this.draftMulti()[key];
  }

  setDraft(key: MultiFilterKey, values: string[]): void {
    this.draftMulti.update((m) => ({ ...m, [key]: values }));
  }

  draftFlag(key: FlagKey): string {
    return this.draftFlags()[key];
  }

  setDraftFlag(key: FlagKey, value: string): void {
    this.draftFlags.update((f) => ({ ...f, [key]: value }));
  }

  applyFilters(): void {
    const multi = this.draftMulti();
    const flags = this.draftFlags();

    this.updateQueryParams({
      status: multi.status.join(',') || undefined,
      payment_method: multi.payment_method.join(',') || undefined,
      delivery_type: multi.delivery_type.join(',') || undefined,
      fulfillment_method: multi.fulfillment_method.join(',') || undefined,
      is_fina_cleared: flags.is_fina_cleared || undefined,
      is_installment_sale: flags.is_installment_sale || undefined,
      is_product_exchange: flags.is_product_exchange || undefined,
      city: this.draftCity() || undefined,
      created_by_user_id: this.draftUploadedBy() || undefined,
      min_amount: this.draftMinAmount() || undefined,
      max_amount: this.draftMaxAmount() || undefined,
      offset: 0,
    });

    this.filtersOpen.set(false);
  }

  closeFilters(): void {
    this.filtersOpen.set(false);
  }

  resetDraftFilters(): void {
    this.draftMulti.set(this.emptyMulti());
    this.draftFlags.set(this.emptyFlags());
    this.draftCity.set('');
    this.draftUploadedBy.set('');
    this.draftMinAmount.set('');
    this.draftMaxAmount.set('');
  }

  removeChip(chip: FilterChip): void {
    if ((this.multiFilterKeys as readonly string[]).includes(chip.key)) {
      const key = chip.key as MultiFilterKey;
      const next = this.csvParam(key).filter((v) => v !== chip.value);
      this.updateQueryParams({ [key]: next.join(',') || undefined, offset: 0 });
      return;
    }
    this.updateQueryParams({ [chip.key]: undefined, offset: 0 });
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.selectedPreset.set('');
    this.updateQueryParams({
      search: undefined,
      status: undefined,
      payment_method: undefined,
      delivery_type: undefined,
      fulfillment_method: undefined,
      is_fina_cleared: undefined,
      is_installment_sale: undefined,
      is_product_exchange: undefined,
      city: undefined,
      created_by_user_id: undefined,
      min_amount: undefined,
      max_amount: undefined,
      from_date: undefined,
      to_date: undefined,
      offset: 0,
    });
  }

  paymentMethodLabel(method: string | null): string {
    switch (method) {
      case 'card':
        return 'ბარათით ონლაინ';
      case 'pos':
        return 'ბარათი (POS)';
      case 'pos_bog':
        return 'POS — BOG';
      case 'pos_tbc':
        return 'POS — TBC';
      case 'pos_liberty':
        return 'POS — Liberty';
      case 'cash':
        return 'ნაღდი';
      case 'transfer':
        return 'გადარიცხვა';
      case 'transfer_bog':
        return 'ჩარიცხვა — საქართველოს ბანკი';
      case 'transfer_tbc':
        return 'ჩარიცხვა — თიბისი';
      case 'transfer_extra':
        return 'ჩარიცხვა — extra.ge';
      case 'cash_on_delivery':
        return 'ადგილზე გადახდა';
      default:
        return '—';
    }
  }

  orderPaymentMethod(order: Order): string | null {
    return order.payment_method ?? (order.source === 'web' ? 'card' : null);
  }

  paymentMethodShortLabel(method: string | null): string {
    switch (method) {
      case 'card':
        return 'ბარათით';
      case 'cash_on_delivery':
        return 'ადგილზე';
      default:
        return this.paymentMethodLabel(method);
    }
  }

  cityLabel(city: string | null): string {
    if (!city) return '—';
    return georgianCities.find((c) => c.value === city)?.label ?? city;
  }

  fulfillmentMethodLabel(method: string | null): string {
    switch (method) {
      case 'store_pickup':
        return 'მაღაზიიდან გატანა';
      case 'courier':
        return 'საკურიერო მომსახურება';
      default:
        return '—';
    }
  }

  onStatusChange(values: string[]): void {
    this.updateQueryParams({
      status: values.length ? values.join(',') : undefined,
      offset: 0,
    });
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

  openDeleteModal(order: Order): void {
    this.orderToDelete.set(order);
  }

  closeDeleteModal(): void {
    if (this.isDeleting()) return;
    this.orderToDelete.set(null);
  }

  confirmDelete(): void {
    const order = this.orderToDelete();
    if (!order || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.adminService.deleteOrder(order.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.orderToDelete.set(null);
        if (this.selectedId() === order.id) this.selectedId.set(null);
        this.toastService.add('წარმატება', `შეკვეთა #${order.id} წაიშალა`, 3000, 'success');
        this.searchResponse.reload();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.orderToDelete.set(null);
        const message = err?.error?.message || 'შეკვეთის წაშლა ვერ მოხერხდა';
        this.toastService.add('შეცდომა', message, 5000, 'error');
      },
    });
  }

  isUpdatingFina(orderId: number): boolean {
    return this.updatingFina().has(orderId);
  }

  onFinaClearedToggle(order: Order, checked: boolean): void {
    if (checked === order.is_fina_cleared || this.isUpdatingFina(order.id)) return;

    this.updatingFina.update((set) => new Set(set).add(order.id));

    this.adminService.updateOrderFinaCleared(order.id, checked).subscribe({
      next: (updated) => {
        this.finaOverrides.update((m) => ({
          ...m,
          [order.id]: updated.is_fina_cleared,
        }));
        this.clearUpdatingFina(order.id);
      },
      error: () => this.clearUpdatingFina(order.id),
    });
  }

  private clearUpdatingFina(orderId: number): void {
    this.updatingFina.update((set) => {
      const next = new Set(set);
      next.delete(orderId);
      return next;
    });
  }

  onFromDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.fromDate.set(value);
    this.updateQueryParams({
      from_date: value ? this.startOfLocalDay(value) : undefined,
      offset: 0,
    });
  }

  onToDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.toDate.set(value);
    this.updateQueryParams({
      to_date: value ? this.endOfLocalDay(value) : undefined,
      offset: 0,
    });
  }

  readonly datePresets: ComboboxItems[] = [
    { label: 'დღეს', value: 'today' },
    { label: 'გუშინ', value: 'yesterday' },
    { label: 'გუშინწინ', value: 'day_before' },
    { label: '3 დღის წინ', value: 'three_days_ago' },
    { label: '7 დღის', value: 'last_7' },
    { label: '10 დღის', value: 'last_10' },
    { label: 'ამ თვის', value: 'this_month' },
    { label: 'წინა თვის', value: 'last_month' },
  ];

  readonly selectedPreset = signal('');

  constructor() {
    const qp = this.route.snapshot.queryParams;
    if (!qp['from_date'] && !qp['to_date']) {
      this.selectPreset('today');
    }
  }

  private localDateInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private startOfLocalDay(value: string): string {
    return new Date(`${value}T00:00:00`).toISOString();
  }

  private endOfLocalDay(value: string): string {
    return new Date(`${value}T23:59:59.999`).toISOString();
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
      case 'three_days_ago':
        from.setDate(today.getDate() - 3);
        to.setDate(today.getDate() - 3);
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
      from_date: this.startOfLocalDay(fromStr),
      to_date: this.endOfLocalDay(toStr),
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
    if (!value) return '';
    const date = new Date(value);
    return isNaN(date.getTime()) ? value.slice(0, 10) : this.localDateInput(date);
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

    const p = this.normalizedParams();
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

  readonly selectedId = signal<number | null>(null);

  readonly selectedOrder = computed(() => {
    const id = this.selectedId();
    return id === null ? null : (this.orders().find((o) => o.id === id) ?? null);
  });

  readonly lightboxOpen = signal(false);
  readonly lightboxImages = signal<LightboxImage[]>([]);
  readonly lightboxActiveId = signal<string | null>(null);

  openDetail(order: Order): void {
    this.selectedId.set(order.id);
  }

  closeDetail(): void {
    this.selectedId.set(null);
  }

  isSelected(orderId: number): boolean {
    return this.selectedId() === orderId;
  }

  onEscape(): void {
    if (this.filtersOpen()) {
      this.closeFilters();
      return;
    }
    if (this.orderToDelete()) {
      this.closeDeleteModal();
      return;
    }
    if (this.lightboxOpen()) return;
    this.closeDetail();
  }

  customerName(order: Order): string {
    if (order.customer_type === 'company') return order.organization_name || '—';
    return `${order.customer_name ?? ''} ${order.customer_surname ?? ''}`.trim() || '—';
  }

  statusDotClass(status: string): string {
    switch (status) {
      case 'approved':
      case 'shipped':
      case 'finance_cleared':
        return 'bg-success';
      case 'pending':
      case 'processing':
      case 'prepared':
        return 'bg-info';
      case 'refunded':
        return 'bg-warning';
      case 'declined':
        return 'bg-valencia-60';
      default:
        return 'bg-platinum-30';
    }
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

  regionLabel(region: string | null): string {
    if (!region) return '—';
    return TBILISI_REGIONS.find((r) => r.value === region)?.label ?? region;
  }

  deliveryPrice(order: Order): number {
    if (order.delivery_type === 'pickup') return 0;
    if (order.delivery_price != null) return order.delivery_price / 100;
    const city = (order.city ?? '').trim().toLowerCase();
    if (city === 'tbilisi') {
      return order.delivery_time === 'same_day'
        ? tbilisiExpressPrice(order.region ?? '')
        : DELIVERY_PRICES.nextDay;
    }
    return HIGH_MOUNTAIN_CITIES.has(city)
      ? DELIVERY_PRICES.highMountain
      : DELIVERY_PRICES.outsideTbilisi;
  }

  deliveryPriceLabel(order: Order): string {
    const price = this.deliveryPrice(order);
    return price === 0 ? 'უფასო' : `${this.formatItemAmount(price)} ${order.currency}`;
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
