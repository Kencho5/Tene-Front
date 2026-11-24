import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { CompanyInvoice, InvoiceStatus } from '@core/interfaces/admin/companies.interface';
import { CompaniesService } from '@core/services/admin/companies.service';
import { ToastService } from '@core/services/toast.service';
import { AdminDialogComponent } from '@shared/components/admin/admin-dialog/admin-dialog.component';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import { SharedModule } from '@shared/shared.module';
import { of } from 'rxjs';
import {
  INVOICE_BADGE,
  INVOICE_STATUS_ITEMS,
  INVOICE_STATUS_LABELS,
  WASTE_TYPE_LABELS,
  errorMessage,
  formatDate,
  formatDateTime,
  formatKg,
  formatMoney,
} from '@utils/companies';

const DEFAULT_LIMIT = 20;

@Component({
  selector: 'app-admin-invoices',
  imports: [SharedModule, DropdownComponent, PaginationComponent, AdminDialogComponent],
  templateUrl: './admin-invoices.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminInvoicesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly companiesService = inject(CompaniesService);
  private readonly toastService = inject(ToastService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly statusItems = INVOICE_STATUS_ITEMS;
  readonly statusLabels = INVOICE_STATUS_LABELS;
  readonly statusBadge = INVOICE_BADGE;
  readonly wasteLabels = WASTE_TYPE_LABELS;
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;
  readonly formatMoney = formatMoney;
  readonly formatKg = formatKg;
  readonly dropdownClass =
    '!h-11 sm:!h-9 !text-[15px] sm:!text-sm !rounded-lg !border-hairline-strong/70 !px-3 shadow-[0_1px_1px_rgba(33,33,33,0.04)]';

  readonly params = toSignal(this.route.queryParams, { initialValue: {} as Params });
  readonly limit = computed(() => Number(this.params()['limit']) || DEFAULT_LIMIT);
  readonly offset = computed(() => Number(this.params()['offset']) || 0);
  readonly companyFilter = computed(() => this.params()['company_id'] ?? '');
  readonly statusFilter = computed(() => this.params()['status'] ?? '');
  readonly fromFilter = computed(() => this.params()['from'] ?? '');
  readonly toFilter = computed(() => this.params()['to'] ?? '');
  readonly openId = computed(() => Number(this.params()['open']) || null);
  readonly hasFilters = computed(
    () => !!(this.companyFilter() || this.statusFilter() || this.fromFilter() || this.toFilter()),
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

  readonly invoicesResource = rxResource({
    params: () => ({
      company_id: Number(this.companyFilter()) || undefined,
      status: (this.statusFilter() || undefined) as InvoiceStatus | undefined,
      from: this.fromFilter() || undefined,
      to: this.toFilter() || undefined,
      limit: this.limit(),
      offset: this.offset(),
    }),
    stream: ({ params }) => this.companiesService.listInvoices(params),
  });

  readonly invoices = computed<CompanyInvoice[]>(() => this.invoicesResource.value()?.invoices ?? []);
  readonly total = computed(() => this.invoicesResource.value()?.total ?? 0);
  readonly currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit()));
  readonly showingFrom = computed(() => Math.min(this.offset() + 1, this.total()));
  readonly showingTo = computed(() => Math.min(this.offset() + this.limit(), this.total()));

  readonly detailResource = rxResource({
    params: () => this.openId() ?? undefined,
    stream: ({ params }) => (params ? this.companiesService.getInvoice(params) : of(undefined)),
  });
  readonly detail = computed(() => this.detailResource.value());
  readonly detailHtml = computed<SafeHtml | null>(() => {
    const html = this.detail()?.html;
    return html ? this.sanitizer.bypassSecurityTrustHtml(html) : null;
  });

  readonly isSending = signal(false);
  readonly isUpdatingPayment = signal(false);

  setFilter(key: string, value: string | undefined): void {
    this.updateQueryParams({ [key]: value || undefined, offset: undefined });
  }

  onDateFilter(key: 'from' | 'to', event: Event): void {
    this.setFilter(key, (event.target as HTMLInputElement).value);
  }

  clearFilters(): void {
    this.updateQueryParams({
      company_id: undefined,
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

  open(invoice: CompanyInvoice): void {
    this.updateQueryParams({ open: invoice.id });
  }

  close(): void {
    this.updateQueryParams({ open: undefined });
  }

  send(): void {
    const id = this.openId();
    if (!id || this.isSending()) return;
    this.isSending.set(true);
    this.companiesService.sendInvoice(id).subscribe({
      next: (delivery) => {
        this.isSending.set(false);
        this.detailResource.reload();
        this.invoicesResource.reload();
        if (delivery.success) {
          this.toastService.add('ინვოისი გაიგზავნა', delivery.recipients.join(', '), 4000, 'success');
        } else {
          this.toastService.add('გაგზავნა ვერ მოხერხდა', delivery.error ?? '', 6000, 'error');
        }
      },
      error: (e) => {
        this.isSending.set(false);
        this.toastService.add('შეცდომა', errorMessage(e, 'გაგზავნა ვერ მოხერხდა'), 5000, 'error');
      },
    });
  }

  togglePaid(): void {
    const invoice = this.detail();
    if (!invoice || this.isUpdatingPayment()) return;
    this.isUpdatingPayment.set(true);
    this.companiesService.setInvoicePaid(invoice.id, invoice.status !== 'paid').subscribe({
      next: (updated) => {
        this.isUpdatingPayment.set(false);
        this.detailResource.reload();
        this.invoicesResource.reload();
        this.toastService.add(
          'წარმატება',
          updated.status === 'paid' ? 'ინვოისი მოინიშნა გადახდილად' : 'გადახდა გაუქმდა',
          3000,
          'success',
        );
      },
      error: (e) => {
        this.isUpdatingPayment.set(false);
        this.toastService.add('შეცდომა', errorMessage(e, 'სტატუსის შეცვლა ვერ მოხერხდა'), 5000, 'error');
      },
    });
  }

  openInNewTab(): void {
    const detail = this.detail();
    if (!detail) return;
    const url = URL.createObjectURL(new Blob([detail.html], { type: 'text/html;charset=utf-8' }));
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
