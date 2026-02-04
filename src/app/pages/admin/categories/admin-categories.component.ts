import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import { SharedModule } from '@shared/shared.module';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { AdminService } from '@core/services/admin/admin.service';
import { ToastService } from '@core/services/toast.service';
import { finalize } from 'rxjs';
import { Category } from '@core/interfaces/admin/categories.interface';
import { CategoryTreeNode } from '@core/interfaces/categories.interface';

interface CategoryWithDepth extends Category {
  depth: number;
}

@Component({
  selector: 'app-admin-categories',
  imports: [
    SharedModule,
    DropdownComponent,
    ConfirmationModalComponent,
    PaginationComponent,
  ],
  templateUrl: './admin-categories.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCategoriesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  private debounceTimer?: number;

  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly categoryToDelete = signal<number | null>(null);

  readonly statusOptions: ComboboxItems[] = [
    { label: 'ყველა', value: 'all' },
    { label: 'აქტიური', value: 'enabled' },
    { label: 'გამორთული', value: 'disabled' },
  ];

  readonly params = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });

  private flattenTree(nodes: CategoryTreeNode[], parentId: number | null = null, depth: number = 0): CategoryWithDepth[] {
    let result: CategoryWithDepth[] = [];
    nodes.forEach((node) => {
      // Create a flat category object from tree node with depth
      const category: CategoryWithDepth = {
        id: node.id,
        name: node.name,
        slug: node.slug,
        parent_id: parentId,
        description: (node as any).description || null,
        display_order: (node as any).display_order || 0,
        enabled: (node as any).enabled !== undefined ? (node as any).enabled : true,
        image_url: (node as any).image_url || null,
        created_at: (node as any).created_at || '',
        updated_at: (node as any).updated_at || '',
        depth: depth,
      };
      result.push(category);

      if (node.children && node.children.length > 0) {
        result = result.concat(this.flattenTree(node.children, node.id, depth + 1));
      }
    });
    return result;
  }

  readonly allCategories = toSignal(
    this.route.queryParams.pipe(
      tap(() => this.isLoading.set(true)),
      switchMap(() =>
        this.adminService.getAdminCategoryTree().pipe(
          map((response) => this.flattenTree(response.categories)),
          catchError(() => of([])),
        ),
      ),
      tap(() => this.isLoading.set(false)),
    ),
    { initialValue: [] },
  );

  readonly searchResponse = computed(() => {
    const params = this.params();
    let filtered = this.allCategories();

    // Search filter
    const query = params['query']?.toLowerCase();
    const id = params['id'];
    if (query) {
      filtered = filtered.filter((cat) =>
        cat.name.toLowerCase().includes(query) ||
        cat.slug.toLowerCase().includes(query)
      );
    } else if (id) {
      filtered = filtered.filter((cat) => cat.id === Number(id));
    }

    // Status filter
    const enabled = params['enabled'];
    if (enabled === 'true') {
      filtered = filtered.filter((cat) => cat.enabled);
    } else if (enabled === 'false') {
      filtered = filtered.filter((cat) => !cat.enabled);
    }

    // Pagination
    const limit = Number(params['limit']) || 10;
    const offset = Number(params['offset']) || 0;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      categories: paginated,
      total: filtered.length,
      limit,
      offset,
    };
  });

  readonly categories = computed(() => this.searchResponse().categories as CategoryWithDepth[]);
  readonly totalCategories = computed(() => this.searchResponse().total);
  readonly currentPage = computed(() => {
    const offset = Number(this.params()['offset']) || 0;
    const limit = Number(this.params()['limit']) || 10;
    return Math.floor(offset / limit) + 1;
  });
  readonly totalPages = computed(() => {
    const limit = Number(this.params()['limit']) || 10;
    return Math.ceil(this.totalCategories() / limit);
  });
  readonly limit = computed(() => Number(this.params()['limit']) || 10);
  readonly offset = computed(() => Number(this.params()['offset']) || 0);

  readonly showingFrom = computed(() => {
    const offset = this.offset();
    return Math.min(offset + 1, this.totalCategories());
  });

  readonly showingTo = computed(() => {
    const offset = this.offset();
    const limit = this.limit();
    return Math.min(offset + limit, this.totalCategories());
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
      });
    }, 400);
  }

  onStatusChange(value: string | undefined): void {
    if (value === 'all' || !value) {
      this.updateQueryParams({ enabled: undefined });
    } else {
      this.updateQueryParams({
        enabled: value === 'enabled' ? 'true' : 'false',
      });
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.updateQueryParams({ query: undefined, id: undefined });
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

  openDeleteModal(categoryId: number): void {
    this.categoryToDelete.set(categoryId);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.categoryToDelete.set(null);
  }

  confirmDelete(): void {
    const categoryId = this.categoryToDelete();
    if (categoryId === null) return;

    let toastParams: [string, string, number, 'success' | 'error'] | null =
      null;

    this.adminService
      .deleteCategory(categoryId)
      .pipe(
        tap(() => {
          toastParams = [
            'წარმატება',
            'კატეგორია წარმატებით წაიშალა',
            3000,
            'success',
          ];
          this.updateQueryParams({ _t: Date.now() });
        }),
        catchError((error) => {
          toastParams = ['შეცდომა', error.error.message, 3000, 'error'];
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
    this.updateQueryParams({ limit: value || '10', offset: 0 });
  }

  toggleCategoryStatus(categoryId: number, currentStatus: boolean): void {
    let toastParams: [string, string, number, 'success' | 'error'] | null =
      null;

    this.adminService
      .updateCategory(categoryId, { enabled: !currentStatus } as any)
      .pipe(
        tap(() => {
          toastParams = [
            'წარმატება',
            currentStatus ? 'კატეგორია გამორთულია' : 'კატეგორია ჩართულია',
            3000,
            'success',
          ];
          this.updateQueryParams({ _t: Date.now() });
        }),
        catchError((error) => {
          toastParams = ['შეცდომა', error.error.message, 3000, 'error'];
          return of(null);
        }),
        finalize(() => {
          if (toastParams) {
            this.toastService.add(...toastParams);
          }
        }),
      )
      .subscribe();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }
}
