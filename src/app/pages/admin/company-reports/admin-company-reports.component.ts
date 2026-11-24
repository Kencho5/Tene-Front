import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { ExportDataset } from '@core/interfaces/admin/companies.interface';
import { CompaniesService } from '@core/services/admin/companies.service';
import { ToastService } from '@core/services/toast.service';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { SharedModule } from '@shared/shared.module';
import {
  CONTRACT_BADGE,
  CONTRACT_STATUS_LABELS,
  WASTE_TYPE_LABELS,
  downloadBlob,
  formatDate,
  formatKg,
  formatMoney,
  toDateInput,
} from '@utils/companies';

const PERIOD_PRESETS: ComboboxItems[] = [
  { label: 'ამ თვის', value: 'this_month' },
  { label: 'წინა თვის', value: 'last_month' },
  { label: 'ბოლო 30 დღე', value: 'last_30' },
  { label: 'ბოლო 90 დღე', value: 'last_90' },
  { label: 'ამ წლის', value: 'this_year' },
];

const EXPORT_ITEMS: ComboboxItems[] = [
  { label: 'ყველა მონაცემი', value: 'all' },
  { label: 'კომპანიები', value: 'companies' },
  { label: 'მისამართები', value: 'addresses' },
  { label: 'საკონტაქტო პირები', value: 'contacts' },
  { label: 'ხელშეკრულებები', value: 'contracts' },
  { label: 'ტარიფები', value: 'tariffs' },
  { label: 'გატანების ისტორია', value: 'pickups' },
  { label: 'ნარჩენების რაოდენობა', value: 'waste_totals' },
  { label: 'ინვოისები', value: 'invoices' },
];

@Component({
  selector: 'app-admin-company-reports',
  imports: [SharedModule, DropdownComponent],
  templateUrl: './admin-company-reports.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCompanyReportsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly companiesService = inject(CompaniesService);
  private readonly toastService = inject(ToastService);

  readonly periodPresets = PERIOD_PRESETS;
  readonly exportItems = EXPORT_ITEMS;
  readonly wasteLabels = WASTE_TYPE_LABELS;
  readonly contractBadge = CONTRACT_BADGE;
  readonly contractLabels = CONTRACT_STATUS_LABELS;
  readonly formatDate = formatDate;
  readonly formatKg = formatKg;
  readonly formatMoney = formatMoney;
  readonly dropdownClass =
    '!h-11 sm:!h-9 !text-[15px] sm:!text-sm !rounded-lg !border-hairline-strong/70 !px-3 shadow-[0_1px_1px_rgba(33,33,33,0.04)]';

  readonly params = toSignal(this.route.queryParams, { initialValue: {} as Params });
  readonly companyFilter = computed(() => this.params()['company_id'] ?? '');
  readonly fromFilter = computed(() => this.params()['from'] ?? '');
  readonly toFilter = computed(() => this.params()['to'] ?? '');
  readonly selectedPreset = signal('');
  readonly exportDataset = signal('all');
  readonly isExporting = signal(false);

  private readonly filterParams = computed(() => ({
    company_id: Number(this.companyFilter()) || undefined,
    from: this.fromFilter() || undefined,
    to: this.toFilter() || undefined,
  }));

  readonly companiesResource = rxResource({
    stream: () => this.companiesService.listCompanies({ limit: 100 }),
  });
  readonly companyItems = computed<ComboboxItems[]>(() =>
    (this.companiesResource.value()?.companies ?? []).map((c) => ({
      value: String(c.id),
      label: c.name,
    })),
  );

  readonly reportResource = rxResource({
    params: () => this.filterParams(),
    stream: ({ params }) => this.companiesService.getReport(params),
  });
  readonly report = computed(() => this.reportResource.value());

  readonly contractsResource = rxResource({
    params: () => ({ company_id: Number(this.companyFilter()) || undefined, current_only: true }),
    stream: ({ params }) => this.companiesService.listContracts(params),
  });
  readonly attentionContracts = computed(() =>
    (this.contractsResource.value() ?? []).filter(
      (c) => c.status === 'expired' || c.status === 'expiring',
    ),
  );

  readonly maxWasteKg = computed(() =>
    Math.max(1, ...(this.report()?.waste_totals ?? []).map((w) => Number(w.quantity_kg))),
  );

  readonly totalWasteKg = computed(() =>
    (this.report()?.waste_totals ?? []).reduce((sum, w) => sum + Number(w.quantity_kg), 0),
  );

  readonly periodLabel = computed(() => {
    const from = this.fromFilter();
    const to = this.toFilter();
    if (!from && !to) return 'სრული პერიოდი';
    return `${from ? formatDate(from) : '...'} – ${to ? formatDate(to) : '...'}`;
  });

  setCompany(value: string | undefined): void {
    this.updateQueryParams({ company_id: value || undefined });
  }

  onDateChange(key: 'from' | 'to', event: Event): void {
    this.selectedPreset.set('');
    this.updateQueryParams({ [key]: (event.target as HTMLInputElement).value || undefined });
  }

  selectPreset(value: string | undefined): void {
    this.selectedPreset.set(value ?? '');
    if (!value) return;
    const today = new Date();
    let from = new Date(today);
    let to = new Date(today);
    switch (value) {
      case 'this_month':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last_month':
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last_30':
        from.setDate(today.getDate() - 29);
        break;
      case 'last_90':
        from.setDate(today.getDate() - 89);
        break;
      case 'this_year':
        from = new Date(today.getFullYear(), 0, 1);
        break;
    }
    this.updateQueryParams({ from: toDateInput(from), to: toDateInput(to) });
  }

  clearFilters(): void {
    this.selectedPreset.set('');
    this.updateQueryParams({ company_id: undefined, from: undefined, to: undefined });
  }

  exportExcel(): void {
    if (this.isExporting()) return;
    const dataset = this.exportDataset();
    this.isExporting.set(true);
    this.companiesService
      .exportExcel({
        ...this.filterParams(),
        dataset: dataset === 'all' ? undefined : (dataset as ExportDataset),
      })
      .subscribe({
        next: (blob) => {
          this.isExporting.set(false);
          downloadBlob(blob, `${dataset === 'all' ? 'companies-report' : dataset}.xlsx`);
        },
        error: () => {
          this.isExporting.set(false);
          this.toastService.add('შეცდომა', 'Excel-ის ჩამოტვირთვა ვერ მოხერხდა', 4000, 'error');
        },
      });
  }

  private updateQueryParams(params: Record<string, string | undefined>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
