import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { CheckoutSession } from '@core/interfaces/admin/checkout-sessions.interface';
import { CheckoutStepKey } from '@core/services/checkout-analytics.service';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import { SharedModule } from '@shared/shared.module';
import { AdminService } from '@core/services/admin/admin.service';

@Component({
  selector: 'app-admin-checkout-sessions',
  imports: [SharedModule, DropdownComponent, PaginationComponent],
  templateUrl: './admin-checkout-sessions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCheckoutSessionsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private debounceTimer?: number;

  readonly searchQuery = signal('');
  readonly expandedSessionId = signal<string | null>(null);

  readonly outcomeOptions: ComboboxItems[] = [
    { label: 'ყველა', value: 'all' },
    { label: 'დასრულებული', value: 'completed' },
    { label: 'მიტოვებული', value: 'abandoned' },
  ];

  readonly stepOptions: ComboboxItems[] = [
    { label: 'ყველა ეტაპი', value: 'all' },
    { label: 'საკონტაქტო', value: 'contact' },
    { label: 'მიწოდება', value: 'delivery' },
    { label: 'მიმოხილვა', value: 'review' },
    { label: 'გადახდა', value: 'payment' },
  ];

  readonly params = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });

  readonly searchResponse = rxResource({
    defaultValue: { sessions: [], total: 0, limit: 0, offset: 0 },
    params: () => {
      const p = { ...this.params() };
      if (p['outcome'] === 'all') delete p['outcome'];
      if (p['step'] === 'all') delete p['step'];
      return new URLSearchParams(p).toString();
    },
    stream: ({ params }) => this.adminService.searchCheckoutSessions(params),
  });

  readonly sessions = computed(() => this.searchResponse.value().sessions);
  readonly totalSessions = computed(() => this.searchResponse.value().total);
  readonly loading = computed(() => this.searchResponse.isLoading());

  readonly limit = computed(() => Number(this.params()['limit']) || 6);
  readonly offset = computed(() => Number(this.params()['offset']) || 0);
  readonly currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  readonly totalPages = computed(() => Math.ceil(this.totalSessions() / this.limit()));
  readonly showingFrom = computed(() => Math.min(this.offset() + 1, this.totalSessions()));
  readonly showingTo = computed(() => Math.min(this.offset() + this.limit(), this.totalSessions()));

  private readonly fieldLabels: Record<string, string> = {
    customer_type: 'პირის ტიპი',
    'individual.name': 'სახელი',
    'individual.surname': 'გვარი',
    'company.organization_type': 'ორგ. ტიპი',
    'company.organization_name': 'ორგანიზაცია',
    'company.organization_code': 'ს/კ',
    email: 'ელ. ფოსტა',
    phone_number: 'ტელეფონი',
    address: 'მისამართი',
    guest_city: 'ქალაქი',
    guest_address: 'მისამართი',
    guest_details: 'დეტალები',
    delivery_type: 'მიწოდების ტიპი',
    delivery_time: 'მიწოდების დრო',
    comment: 'კომენტარი',
  };

  private readonly hiddenFields = new Set(['customer_type', 'company.organization_type']);

  private readonly valueLabels: Record<string, Record<string, string>> = {
    delivery_type: {
      delivery: 'საკურიერო',
      pickup: 'ჩემით წავიღებ',
    },
    delivery_time: {
      same_day: 'იმავე დღეს',
      next_day: 'მეორე დღეს',
    },
  };

  fieldLabel(field: string): string {
    return this.fieldLabels[field] ?? field;
  }

  fieldValue(field: string, value: string): string {
    return this.valueLabels[field]?.[value] ?? value;
  }

  displayName(session: CheckoutSession): string {
    const f = session.fields;
    const company = f['company.organization_name'];
    if (company) return company;
    const full = [f['individual.name'], f['individual.surname']].filter(Boolean).join(' ').trim();
    if (full) return full;
    return session.is_guest ? 'სტუმარი' : `User #${session.user_id}`;
  }

  fieldEntries(session: CheckoutSession): { label: string; value: string }[] {
    return Object.entries(session.fields)
      .filter(([field, value]) => value !== '' && !this.hiddenFields.has(field))
      .map(([field, value]) => ({
        label: this.fieldLabel(field),
        value: this.fieldValue(field, value),
      }));
  }

  readonly steps: { key: CheckoutStepKey; label: string }[] = [
    { key: 'contact', label: 'კონტაქტი' },
    { key: 'delivery', label: 'მიწოდება' },
    { key: 'review', label: 'მიმოხილვა' },
    { key: 'payment', label: 'გადახდა' },
  ];

  stepReached(session: CheckoutSession, index: number): boolean {
    return (session.last_step_index ?? -1) >= index;
  }

  orderStatusLabel(status: string | null): string {
    switch (status) {
      case 'approved':
        return 'გადახდილი';
      case 'pending':
        return 'მოლოდინში';
      case 'processing':
        return 'მუშავდება';
      case 'declined':
        return 'უარყოფილი';
      case 'expired':
        return 'ვადაგასული';
      default:
        return status ?? '—';
    }
  }

  isPaid(session: CheckoutSession): boolean {
    return session.order_status === 'approved';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ka-GE', { month: 'short', day: 'numeric' });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      const isNumeric = /^\d+$/.test(value);
      this.updateQueryParams({
        session_id: !isNumeric && value ? value : undefined,
        user_id: isNumeric ? value : undefined,
        offset: 0,
      });
    }, 400);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.updateQueryParams({ session_id: undefined, user_id: undefined, offset: 0 });
  }

  onOutcomeChange(value: string | undefined): void {
    this.updateQueryParams({ outcome: value ?? 'all', offset: 0 });
  }

  onStepChange(value: string | undefined): void {
    this.updateQueryParams({ step: value ?? 'all', offset: 0 });
  }

  onPageChange(page: number): void {
    this.updateQueryParams({ offset: (page - 1) * this.limit(), limit: this.limit() });
  }

  onLimitChangeValue(value: string): void {
    this.updateQueryParams({ limit: value || '6', offset: 0 });
  }

  toggleExpand(session: CheckoutSession): void {
    this.expandedSessionId.set(
      this.expandedSessionId() === session.session_id ? null : session.session_id,
    );
  }

  isExpanded(session: CheckoutSession): boolean {
    return this.expandedSessionId() === session.session_id;
  }

  private updateQueryParams(params: Record<string, string | number | undefined>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
