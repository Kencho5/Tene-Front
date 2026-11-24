import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ActivityStatus, CompanySummary } from '@core/interfaces/admin/companies.interface';
import { CompaniesService } from '@core/services/admin/companies.service';
import { ToastService } from '@core/services/toast.service';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import { SharedModule } from '@shared/shared.module';
import {
  ACTIVITY_BADGE,
  ACTIVITY_ITEMS,
  ACTIVITY_LABELS,
  COMPANY_TYPE_LABELS,
  EXPIRY_WARNING_DAYS,
  downloadBlob,
  formatDate,
  formatMoney,
} from '@utils/companies';

const DEFAULT_LIMIT = 20;

@Component({
  selector: 'app-admin-companies',
  imports: [SharedModule, PaginationComponent, DropdownComponent],
  templateUrl: './admin-companies.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCompaniesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly companiesService = inject(CompaniesService);
  private readonly toastService = inject(ToastService);
  private debounceTimer?: number;

  readonly activityItems = ACTIVITY_ITEMS;
  readonly activityLabels = ACTIVITY_LABELS;
  readonly activityBadge = ACTIVITY_BADGE;
  readonly typeLabels = COMPANY_TYPE_LABELS;
  readonly expiryWarningDays = EXPIRY_WARNING_DAYS;
  readonly formatDate = formatDate;
  readonly formatMoney = formatMoney;

  readonly params = toSignal(this.route.queryParams, { initialValue: {} as Params });
  readonly searchQuery = signal<string>(this.route.snapshot.queryParams['query'] ?? '');
  readonly isExporting = signal(false);

  readonly limit = computed(() => Number(this.params()['limit']) || DEFAULT_LIMIT);
  readonly offset = computed(() => Number(this.params()['offset']) || 0);
  readonly activityFilter = computed(() => this.params()['activity'] ?? '');

  readonly companiesResource = rxResource({
    params: () => ({
      query: this.params()['query'] || undefined,
      activity_status: (this.params()['activity'] || undefined) as ActivityStatus | undefined,
      limit: this.limit(),
      offset: this.offset(),
    }),
    stream: ({ params }) => this.companiesService.listCompanies(params),
  });

  readonly companies = computed<CompanySummary[]>(
    () => this.companiesResource.value()?.companies ?? [],
  );
  readonly total = computed(() => this.companiesResource.value()?.total ?? 0);
  readonly currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit()));
  readonly showingFrom = computed(() => Math.min(this.offset() + 1, this.total()));
  readonly showingTo = computed(() => Math.min(this.offset() + this.limit(), this.total()));
  readonly hasFilters = computed(() => !!this.params()['query'] || !!this.activityFilter());

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      this.updateQueryParams({ query: value.trim() || undefined, offset: undefined });
    }, 400);
  }

  onActivityChange(value: string | undefined): void {
    this.updateQueryParams({ activity: value || undefined, offset: undefined });
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.updateQueryParams({ query: undefined, activity: undefined, offset: undefined });
  }

  onPageChange(page: number): void {
    this.updateQueryParams({ offset: (page - 1) * this.limit() });
  }

  onLimitChange(value: string): void {
    this.updateQueryParams({ limit: value || undefined, offset: undefined });
  }

  exportExcel(): void {
    this.isExporting.set(true);
    this.companiesService.exportExcel().subscribe({
      next: (blob) => {
        downloadBlob(blob, 'companies.xlsx');
        this.isExporting.set(false);
      },
      error: () => {
        this.isExporting.set(false);
        this.toastService.add('შეცდომა', 'Excel-ის ჩამოტვირთვა ვერ მოხერხდა', 4000, 'error');
      },
    });
  }

  private updateQueryParams(params: Record<string, string | number | undefined>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
