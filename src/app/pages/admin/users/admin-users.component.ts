import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { AdminService } from '@core/services/admin/admin.service';
import { ToastService } from '@core/services/toast.service';
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import { SharedModule } from '@shared/shared.module';
import { catchError, finalize, map, of, switchMap, tap } from 'rxjs';
import { UserRole } from '@core/interfaces/admin/users.interface';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';

@Component({
  selector: 'app-admin-users',
  imports: [
    SharedModule,
    ConfirmationModalComponent,
    PaginationComponent,
    DropdownComponent,
  ],
  templateUrl: './admin-users.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  private debounceTimer?: number;

  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly userToDelete = signal<number | null>(null);
  readonly updatingRole = signal<number | null>(null);

  readonly roleOptions: ComboboxItems[] = [
    { label: 'მომხმარებელი', value: 'user' },
    { label: 'ადმინი', value: 'admin' },
  ];

  readonly params = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });

  readonly searchResponse = toSignal(
    this.route.queryParams.pipe(
      tap(() => this.isLoading.set(true)),
      map((params) => new URLSearchParams(params).toString()),
      switchMap((query) =>
        this.adminService
          .searchUsers(query)
          .pipe(
            catchError(() => of({ users: [], total: 0, limit: 0, offset: 0 })),
          ),
      ),
      tap(() => this.isLoading.set(false)),
    ),
    { initialValue: { users: [], total: 0, limit: 0, offset: 0 } },
  );

  readonly users = computed(() => this.searchResponse().users);
  readonly totalUsers = computed(() => this.searchResponse().total);
  readonly currentPage = computed(() => {
    const offset = Number(this.params()['offset']) || 0;
    const limit = Number(this.params()['limit']) || 10;
    return Math.floor(offset / limit) + 1;
  });
  readonly totalPages = computed(() => {
    const limit = Number(this.params()['limit']) || 10;
    return Math.ceil(this.totalUsers() / limit);
  });
  readonly limit = computed(() => Number(this.params()['limit']) || 10);
  readonly offset = computed(() => Number(this.params()['offset']) || 0);

  readonly showingFrom = computed(() => {
    const offset = this.offset();
    return Math.min(offset + 1, this.totalUsers());
  });

  readonly showingTo = computed(() => {
    const offset = this.offset();
    const limit = this.limit();
    return Math.min(offset + limit, this.totalUsers());
  });

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);

    clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      const isNumeric = /^\d+$/.test(value);
      this.updateQueryParams({
        email: isNumeric ? undefined : value || undefined,
        id: isNumeric ? value : undefined,
      });
    }, 400);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.updateQueryParams({ email: undefined, id: undefined });
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

  openDeleteModal(userId: number): void {
    this.userToDelete.set(userId);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.userToDelete.set(null);
  }

  confirmDelete(): void {
    const userId = this.userToDelete();
    if (userId === null) return;

    let toastParams: [string, string, number, 'success' | 'error'] | null =
      null;

    this.adminService
      .deleteUser(userId)
      .pipe(
        tap(() => {
          toastParams = [
            'წარმატება',
            'მომხმარებელი წარმატებით წაიშალა',
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

  onRoleChange(userId: number, newRole: string | undefined): void {
    if (!newRole) return;

    this.updatingRole.set(userId);

    let toastParams: [string, string, number, 'success' | 'error'] | null =
      null;

    this.adminService
      .updateUser(userId, { role: newRole as UserRole })
      .pipe(
        tap(() => {
          toastParams = [
            'წარმატება',
            'როლი წარმატებით განახლდა',
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
          this.updatingRole.set(null);
        }),
      )
      .subscribe();
  }

  onPageChange(page: number): void {
    const offset = (page - 1) * this.limit();
    this.updateQueryParams({ offset, limit: this.limit() });
  }

  onLimitChange(value: string): void {
    this.updateQueryParams({ limit: value || '10', offset: 0 });
  }

  getRoleLabel(role: UserRole): string {
    return role === 'admin' ? 'ადმინისტრატორი' : 'მომხმარებელი';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }
}
