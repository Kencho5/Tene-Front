import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import { SharedModule } from '@shared/shared.module';
import { catchError, finalize, of, tap } from 'rxjs';
import { AdminService } from '@core/services/admin/admin.service';
import { ToastService } from '@core/services/toast.service';
import { CableType, CableVariant } from '@core/interfaces/admin/cable-types.interface';

@Component({
  selector: 'app-admin-cable-types',
  imports: [SharedModule, ConfirmationModalComponent, PaginationComponent],
  templateUrl: './admin-cable-types.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCableTypesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  private debounceTimer?: number;

  readonly searchQuery = signal<string>('');
  readonly expandedTypes = signal<Set<number>>(new Set());

  readonly isVariantDeleteModalOpen = signal<boolean>(false);
  readonly variantToDelete = signal<{ typeId: number; variantId: number } | null>(null);

  readonly isTypeDeleteModalOpen = signal<boolean>(false);
  readonly typeToDelete = signal<CableType | null>(null);

  readonly params = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });

  readonly cableTypesResource = rxResource({
    defaultValue: [] as CableType[],
    stream: () => this.adminService.getCableTypes(),
  });

  readonly sortedTypes = computed<CableType[]>(() =>
    [...this.cableTypesResource.value()]
      .map((t) => ({
        ...t,
        variants: [...t.variants].sort(
          (a, b) => a.watts - b.watts || a.length_cm - b.length_cm,
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  readonly searchResponse = computed(() => {
    const params = this.params();
    let filtered = this.sortedTypes();

    const query = params['query']?.toLowerCase();
    const id = params['id'];
    if (query) {
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(query));
    } else if (id) {
      filtered = filtered.filter((t) => t.id === Number(id));
    }

    const limit = Number(params['limit']) || 12;
    const offset = Number(params['offset']) || 0;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      types: paginated,
      total: filtered.length,
      totalVariants: filtered.reduce((sum, t) => sum + t.variants.length, 0),
      limit,
      offset,
    };
  });

  readonly types = computed(() => this.searchResponse().types);
  readonly totalTypes = computed(() => this.searchResponse().total);
  readonly totalVariants = computed(() => this.searchResponse().totalVariants);
  readonly currentPage = computed(() => {
    const offset = Number(this.params()['offset']) || 0;
    const limit = Number(this.params()['limit']) || 12;
    return Math.floor(offset / limit) + 1;
  });
  readonly totalPages = computed(() => {
    const limit = Number(this.params()['limit']) || 12;
    return Math.ceil(this.totalTypes() / limit);
  });
  readonly limit = computed(() => Number(this.params()['limit']) || 12);
  readonly offset = computed(() => Number(this.params()['offset']) || 0);

  readonly showingFrom = computed(() => {
    const offset = this.offset();
    return Math.min(offset + 1, this.totalTypes());
  });

  readonly showingTo = computed(() => {
    const offset = this.offset();
    const limit = this.limit();
    return Math.min(offset + limit, this.totalTypes());
  });

  isExpanded(typeId: number): boolean {
    return this.expandedTypes().has(typeId);
  }

  toggleType(typeId: number): void {
    this.expandedTypes.update((set) => {
      const next = new Set(set);
      if (next.has(typeId)) next.delete(typeId);
      else next.add(typeId);
      return next;
    });
  }

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

  // Variant delete
  openVariantDeleteModal(typeId: number, variant: CableVariant): void {
    this.variantToDelete.set({ typeId, variantId: variant.id });
    this.isVariantDeleteModalOpen.set(true);
  }

  closeVariantDeleteModal(): void {
    this.isVariantDeleteModalOpen.set(false);
    this.variantToDelete.set(null);
  }

  confirmVariantDelete(): void {
    const target = this.variantToDelete();
    if (!target) return;

    let toastParams: [string, string, number, 'success' | 'error'] | null = null;

    this.adminService
      .deleteCableVariant(target.typeId, target.variantId)
      .pipe(
        tap(() => {
          toastParams = ['წარმატება', 'ვარიანტი წარმატებით წაიშალა', 3000, 'success'];
          this.cableTypesResource.reload();
        }),
        catchError((error) => {
          toastParams = [
            'შეცდომა',
            error.error?.message || 'ვარიანტის წაშლა ვერ მოხერხდა',
            3000,
            'error',
          ];
          return of(null);
        }),
        finalize(() => {
          if (toastParams) this.toastService.add(...toastParams);
          this.closeVariantDeleteModal();
        }),
      )
      .subscribe();
  }

  // Type delete
  openTypeDeleteModal(type: CableType, event: Event): void {
    event.stopPropagation();
    this.typeToDelete.set(type);
    this.isTypeDeleteModalOpen.set(true);
  }

  closeTypeDeleteModal(): void {
    this.isTypeDeleteModalOpen.set(false);
    this.typeToDelete.set(null);
  }

  confirmTypeDelete(): void {
    const type = this.typeToDelete();
    if (!type) return;

    let toastParams: [string, string, number, 'success' | 'error'] | null = null;

    this.adminService
      .deleteCableType(type.id)
      .pipe(
        tap(() => {
          toastParams = ['წარმატება', 'კაბელის ტიპი წაიშალა', 3000, 'success'];
          this.cableTypesResource.reload();
        }),
        catchError((error) => {
          toastParams = [
            'შეცდომა',
            error.error?.message || 'ტიპის წაშლა ვერ მოხერხდა',
            3000,
            'error',
          ];
          return of(null);
        }),
        finalize(() => {
          if (toastParams) this.toastService.add(...toastParams);
          this.closeTypeDeleteModal();
        }),
      )
      .subscribe();
  }

  onPageChange(page: number): void {
    const offset = (page - 1) * this.limit();
    this.updateQueryParams({ offset, limit: this.limit() });
  }

  onLimitChangeValue(value: string): void {
    this.updateQueryParams({ limit: value || '12', offset: 0 });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }
}
