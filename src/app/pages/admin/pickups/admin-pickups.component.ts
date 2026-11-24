import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { form, FormField, required } from '@angular/forms/signals';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import {
  CompanyPickup,
  PickupConfirmResponse,
  PickupStatus,
  WasteType,
} from '@core/interfaces/admin/companies.interface';
import { CompaniesService } from '@core/services/admin/companies.service';
import { ToastService } from '@core/services/toast.service';
import { AdminDialogComponent } from '@shared/components/admin/admin-dialog/admin-dialog.component';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import { SharedModule } from '@shared/shared.module';
import { of } from 'rxjs';
import {
  PICKUP_BADGE,
  PICKUP_STATUS_ITEMS,
  PICKUP_STATUS_LABELS,
  WASTE_TYPE_ITEMS,
  WASTE_TYPE_LABELS,
  blankToNull,
  errorMessage,
  formatDate,
  formatKg,
  formatMoney,
  todayInput,
} from '@utils/companies';

const DEFAULT_LIMIT = 20;

interface PickupFormModel {
  company_id: string;
  address_id: string;
  pickup_date: string;
  waste_type: string;
  quantity_kg: string;
  manual_amount: boolean;
  amount: string;
  notes: string;
}

@Component({
  selector: 'app-admin-pickups',
  imports: [SharedModule, FormField, DropdownComponent, PaginationComponent, AdminDialogComponent],
  templateUrl: './admin-pickups.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPickupsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly companiesService = inject(CompaniesService);
  private readonly toastService = inject(ToastService);

  readonly wasteItems = WASTE_TYPE_ITEMS;
  readonly statusItems = PICKUP_STATUS_ITEMS;
  readonly wasteLabels = WASTE_TYPE_LABELS;
  readonly statusLabels = PICKUP_STATUS_LABELS;
  readonly statusBadge = PICKUP_BADGE;
  readonly formatDate = formatDate;
  readonly formatKg = formatKg;
  readonly formatMoney = formatMoney;
  readonly dropdownClass =
    '!h-11 sm:!h-9 !text-[15px] sm:!text-sm !rounded-lg !border-hairline-strong/70 !px-3 shadow-[0_1px_1px_rgba(33,33,33,0.04)]';

  readonly params = toSignal(this.route.queryParams, { initialValue: {} as Params });
  readonly limit = computed(() => Number(this.params()['limit']) || DEFAULT_LIMIT);
  readonly offset = computed(() => Number(this.params()['offset']) || 0);
  readonly companyFilter = computed(() => this.params()['company_id'] ?? '');
  readonly wasteFilter = computed(() => this.params()['waste_type'] ?? '');
  readonly statusFilter = computed(() => this.params()['status'] ?? '');
  readonly fromFilter = computed(() => this.params()['from'] ?? '');
  readonly toFilter = computed(() => this.params()['to'] ?? '');
  readonly hasFilters = computed(
    () =>
      !!(this.companyFilter() || this.wasteFilter() || this.statusFilter() || this.fromFilter() || this.toFilter()),
  );

  readonly companiesResource = rxResource({
    stream: () => this.companiesService.listCompanies({ limit: 100 }),
  });
  readonly companyItems = computed<ComboboxItems[]>(() =>
    (this.companiesResource.value()?.companies ?? []).map((c) => ({
      value: String(c.id),
      label: c.name,
    })),
  );

  readonly pickupsResource = rxResource({
    params: () => ({
      company_id: Number(this.companyFilter()) || undefined,
      waste_type: (this.wasteFilter() || undefined) as WasteType | undefined,
      status: (this.statusFilter() || undefined) as PickupStatus | undefined,
      from: this.fromFilter() || undefined,
      to: this.toFilter() || undefined,
      limit: this.limit(),
      offset: this.offset(),
    }),
    stream: ({ params }) => this.companiesService.listPickups(params),
  });

  readonly pickups = computed<CompanyPickup[]>(() => this.pickupsResource.value()?.pickups ?? []);
  readonly total = computed(() => this.pickupsResource.value()?.total ?? 0);
  readonly currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit()));
  readonly showingFrom = computed(() => Math.min(this.offset() + 1, this.total()));
  readonly showingTo = computed(() => Math.min(this.offset() + this.limit(), this.total()));

  readonly isSaving = signal(false);
  readonly busyPickupId = signal<number | null>(null);
  readonly dialog = signal<{ id?: number } | null>(null);
  readonly deleteTarget = signal<CompanyPickup | null>(null);

  readonly model = signal<PickupFormModel>(this.emptyModel());
  readonly pickupForm = form(this.model, (path) => {
    required(path.company_id, { message: 'აირჩიეთ კომპანია' });
    required(path.pickup_date, { message: 'თარიღი აუცილებელია' });
    required(path.waste_type, { message: 'აირჩიეთ ნარჩენის ტიპი' });
    required(path.quantity_kg, { message: 'რაოდენობა აუცილებელია' });
  });

  private readonly selectedCompanyId = computed(() => Number(this.model().company_id) || null);

  readonly selectedCompanyResource = rxResource({
    params: () => this.selectedCompanyId() ?? undefined,
    stream: ({ params }) => (params ? this.companiesService.getCompany(params) : of(undefined)),
  });

  readonly addressItems = computed(() => this.selectedCompanyResource.value()?.addresses ?? []);

  readonly applicableTariff = computed(() => {
    const company = this.selectedCompanyResource.value();
    const { waste_type, pickup_date } = this.model();
    if (!company || !waste_type || !pickup_date) return null;
    return (
      company.tariff_history
        .filter((t) => t.waste_type === waste_type && t.effective_from <= pickup_date)
        .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0] ?? null
    );
  });

  readonly estimatedAmount = computed(() => {
    const tariff = this.applicableTariff();
    const qty = Number(this.model().quantity_kg);
    if (!tariff || !Number.isFinite(qty) || qty <= 0) return null;
    return Number(tariff.fixed_fee) + qty * Number(tariff.price_per_kg);
  });

  constructor() {
    const snapshot = this.route.snapshot.queryParams;
    if (snapshot['new']) {
      this.openCreate(snapshot['company_id']);
      this.updateQueryParams({ new: undefined });
    }

    effect(() => {
      const addresses = this.addressItems();
      const current = this.model().address_id;
      if (current && !addresses.some((a) => String(a.id) === current)) {
        this.model.update((m) => ({ ...m, address_id: '' }));
      } else if (!current && addresses.length === 1 && this.dialog() && !this.dialog()?.id) {
        this.model.update((m) => ({ ...m, address_id: String(addresses[0].id) }));
      }
    });
  }

  private emptyModel(companyId = ''): PickupFormModel {
    return {
      company_id: companyId,
      address_id: '',
      pickup_date: todayInput(),
      waste_type: 'plastic',
      quantity_kg: '',
      manual_amount: false,
      amount: '',
      notes: '',
    };
  }

  setFilter(key: string, value: string | undefined): void {
    this.updateQueryParams({ [key]: value || undefined, offset: undefined });
  }

  onDateFilter(key: 'from' | 'to', event: Event): void {
    this.setFilter(key, (event.target as HTMLInputElement).value);
  }

  clearFilters(): void {
    this.updateQueryParams({
      company_id: undefined,
      waste_type: undefined,
      status: undefined,
      from: undefined,
      to: undefined,
      offset: undefined,
    });
  }

  onPageChange(page: number): void {
    this.updateQueryParams({ offset: (page - 1) * this.limit() });
  }

  onLimitChange(value: string): void {
    this.updateQueryParams({ limit: value || undefined, offset: undefined });
  }

  openCreate(companyId?: string): void {
    this.model.set(this.emptyModel(companyId ?? this.companyFilter()));
    this.dialog.set({});
  }

  openEdit(pickup: CompanyPickup): void {
    this.model.set({
      company_id: String(pickup.company_id),
      address_id: pickup.address_id ? String(pickup.address_id) : '',
      pickup_date: pickup.pickup_date,
      waste_type: pickup.waste_type,
      quantity_kg: String(Number(pickup.quantity_kg)),
      manual_amount: pickup.amount_overridden,
      amount: pickup.amount_overridden ? String(Number(pickup.amount)) : '',
      notes: pickup.notes ?? '',
    });
    this.dialog.set({ id: pickup.id });
  }

  save(): void {
    const dialog = this.dialog();
    if (!dialog || this.isSaving()) return;
    if (this.pickupForm().invalid()) {
      const first = this.pickupForm().errorSummary()[0]?.message;
      this.toastService.add('შეცდომა', first || 'შეავსეთ აუცილებელი ველები', 4000, 'error');
      return;
    }
    const value = this.model();
    const quantity = Number(value.quantity_kg);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      this.toastService.add('შეცდომა', 'რაოდენობა 0-ზე მეტი უნდა იყოს', 4000, 'error');
      return;
    }
    const amount = value.manual_amount ? Number(value.amount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0 || value.amount.trim() === '')) {
      this.toastService.add('შეცდომა', 'მიუთითეთ სწორი ღირებულება', 4000, 'error');
      return;
    }

    this.isSaving.set(true);
    this.companiesService
      .savePickup(
        {
          company_id: Number(value.company_id),
          address_id: Number(value.address_id) || null,
          pickup_date: value.pickup_date,
          waste_type: value.waste_type as WasteType,
          quantity_kg: quantity,
          amount,
          notes: blankToNull(value.notes),
        },
        dialog.id,
      )
      .subscribe({
        next: (response) => {
          this.isSaving.set(false);
          this.dialog.set(null);
          this.pickupsResource.reload();
          if (response.invoice) {
            this.notifyConfirmed(response);
          } else {
            this.toastService.add(
              'წარმატება',
              dialog.id ? 'გატანა განახლდა' : 'გატანა დაფიქსირდა და ელოდება დადასტურებას',
              3500,
              'success',
            );
          }
        },
        error: (e) => {
          this.isSaving.set(false);
          this.toastService.add('შეცდომა', errorMessage(e, 'გატანის შენახვა ვერ მოხერხდა'), 5000, 'error');
        },
      });
  }

  confirm(pickup: CompanyPickup): void {
    if (this.busyPickupId()) return;
    this.busyPickupId.set(pickup.id);
    this.companiesService.confirmPickup(pickup.id).subscribe({
      next: (response) => {
        this.busyPickupId.set(null);
        this.pickupsResource.reload();
        this.notifyConfirmed(response);
      },
      error: (e) => {
        this.busyPickupId.set(null);
        this.toastService.add('შეცდომა', errorMessage(e, 'დადასტურება ვერ მოხერხდა'), 5000, 'error');
      },
    });
  }

  private notifyConfirmed(response: PickupConfirmResponse): void {
    const number = response.invoice?.invoice_number ?? '';
    const delivery = response.delivery;
    if (delivery?.success) {
      this.toastService.add(
        'ინვოისი გაიგზავნა',
        `${number} → ${delivery.recipients.join(', ')}`,
        5000,
        'success',
      );
    } else {
      this.toastService.add(
        `ინვოისი ${number} შეიქმნა`,
        delivery?.error || 'ელფოსტით გაგზავნა ვერ მოხერხდა — სცადეთ ინვოისების გვერდიდან',
        7000,
        'error',
      );
    }
  }

  confirmDelete(): void {
    const target = this.deleteTarget();
    if (!target || this.isSaving()) return;
    this.isSaving.set(true);
    this.companiesService.deletePickup(target.id).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.deleteTarget.set(null);
        this.pickupsResource.reload();
        this.toastService.add('წარმატება', 'გატანა წაიშალა', 3000, 'success');
      },
      error: (e) => {
        this.isSaving.set(false);
        this.deleteTarget.set(null);
        this.toastService.add('შეცდომა', errorMessage(e, 'წაშლა ვერ მოხერხდა'), 5000, 'error');
      },
    });
  }

  private updateQueryParams(params: Record<string, string | number | undefined>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
