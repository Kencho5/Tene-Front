import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import { SharedModule } from '@shared/shared.module';
import { catchError, finalize, of, tap } from 'rxjs';
import { AdminService } from '@core/services/admin/admin.service';
import { ToastService } from '@core/services/toast.service';
import { Brand } from '@core/interfaces/admin/brands.interface';

@Component({
  selector: 'app-admin-brands',
  imports: [SharedModule, ConfirmationModalComponent, PaginationComponent],
  templateUrl: './admin-brands.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBrandsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  private debounceTimer?: number;

  readonly searchQuery = signal<string>('');
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly brandToDelete = signal<number | null>(null);

  readonly params = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });

  readonly allBrands = rxResource({
    defaultValue: [] as Brand[],
    stream: () => this.adminService.getBrands(),
  });

  readonly searchResponse = computed(() => {
    const params = this.params();
    let filtered = this.allBrands.value();

    const query = params['query']?.toLowerCase();
    const id = params['id'];
    if (query) {
      filtered = filtered.filter((brand) => brand.name.toLowerCase().includes(query));
    } else if (id) {
      filtered = filtered.filter((brand) => brand.id === Number(id));
    }

    const limit = Number(params['limit']) || 15;
    const offset = Number(params['offset']) || 0;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      brands: paginated,
      total: filtered.length,
      limit,
      offset,
    };
  });

  readonly brands = computed(() => this.searchResponse().brands);
  readonly totalBrands = computed(() => this.searchResponse().total);
  readonly currentPage = computed(() => {
    const offset = Number(this.params()['offset']) || 0;
    const limit = Number(this.params()['limit']) || 15;
    return Math.floor(offset / limit) + 1;
  });
  readonly totalPages = computed(() => {
    const limit = Number(this.params()['limit']) || 15;
    return Math.ceil(this.totalBrands() / limit);
  });
  readonly limit = computed(() => Number(this.params()['limit']) || 15);
  readonly offset = computed(() => Number(this.params()['offset']) || 0);

  readonly showingFrom = computed(() => {
    const offset = this.offset();
    return Math.min(offset + 1, this.totalBrands());
  });

  readonly showingTo = computed(() => {
    const offset = this.offset();
    const limit = this.limit();
    return Math.min(offset + limit, this.totalBrands());
  });

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);

    clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      const isNumeric = /^\d+$/.test(value);
      this.updateQueryParams({
        query: isNumeric ? undefined : value || undefined,
        id: isNumeric ? value : undefined,
        offset: 0,
      });
    }, 400);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.updateQueryParams({ query: undefined, id: undefined, offset: 0 });
  }

  private updateQueryParams(params: Record<string, string | number | undefined>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  openDeleteModal(brandId: number): void {
    this.brandToDelete.set(brandId);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.brandToDelete.set(null);
  }

  confirmDelete(): void {
    const brandId = this.brandToDelete();
    if (brandId === null) return;

    let toastParams: [string, string, number, 'success' | 'error'] | null = null;

    this.adminService
      .deleteBrand(brandId)
      .pipe(
        tap(() => {
          toastParams = ['წარმატება', 'ბრენდი წარმატებით წაიშალა', 3000, 'success'];
          this.allBrands.reload();
        }),
        catchError((error) => {
          toastParams = [
            'შეცდომა',
            error.error?.message || 'ბრენდის წაშლა ვერ მოხერხდა',
            3000,
            'error',
          ];
          return of(null);
        }),
        finalize(() => {
          if (toastParams) {
            this.toastService.add(...toastParams);
          }
          this.closeDeleteModal();
        }),
      )
      .subscribe();
  }

  onPageChange(page: number): void {
    const offset = (page - 1) * this.limit();
    this.updateQueryParams({ offset, limit: this.limit() });
  }

  onLimitChangeValue(value: string): void {
    this.updateQueryParams({ limit: value || '15', offset: 0 });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }
}
