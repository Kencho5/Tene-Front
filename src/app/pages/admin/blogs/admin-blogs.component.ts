import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';
import { PaginationComponent } from '@shared/components/ui/pagination/pagination.component';
import { SharedModule } from '@shared/shared.module';
import { catchError, finalize, of, tap } from 'rxjs';
import { AdminService } from '@core/services/admin/admin.service';
import { ToastService } from '@core/services/toast.service';
import { BlogListResponse, BlogStatus } from '@core/interfaces/admin/blogs.interface';

@Component({
  selector: 'app-admin-blogs',
  imports: [SharedModule, ConfirmationModalComponent, PaginationComponent],
  templateUrl: './admin-blogs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBlogsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  readonly isDeleteModalOpen = signal<boolean>(false);
  readonly blogToDelete = signal<number | null>(null);

  readonly params = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });

  readonly statusFilter = computed<BlogStatus | undefined>(() => {
    const status = this.params()['status'];
    return status === 'draft' || status === 'published' ? status : undefined;
  });
  readonly limit = computed(() => Number(this.params()['limit']) || 12);
  readonly offset = computed(() => Number(this.params()['offset']) || 0);

  readonly blogsResource = rxResource({
    params: () => ({
      status: this.statusFilter(),
      limit: this.limit(),
      offset: this.offset(),
    }),
    defaultValue: { blogs: [], total: 0, limit: 12, offset: 0 } as BlogListResponse,
    stream: ({ params }) => this.adminService.listBlogs(params),
  });

  readonly blogs = computed(() => this.blogsResource.value().blogs);
  readonly totalBlogs = computed(() => this.blogsResource.value().total);

  readonly currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  readonly totalPages = computed(() => Math.ceil(this.totalBlogs() / this.limit()) || 1);

  readonly showingFrom = computed(() =>
    this.totalBlogs() === 0 ? 0 : Math.min(this.offset() + 1, this.totalBlogs()),
  );
  readonly showingTo = computed(() => Math.min(this.offset() + this.limit(), this.totalBlogs()));

  setStatusFilter(status: BlogStatus | undefined): void {
    this.updateQueryParams({ status, offset: 0 });
  }

  private updateQueryParams(params: Record<string, string | number | undefined>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  openDeleteModal(blogId: number): void {
    this.blogToDelete.set(blogId);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.blogToDelete.set(null);
  }

  confirmDelete(): void {
    const blogId = this.blogToDelete();
    if (blogId === null) return;

    let toastParams: [string, string, number, 'success' | 'error'] | null = null;

    this.adminService
      .deleteBlog(blogId)
      .pipe(
        tap(() => {
          toastParams = ['წარმატება', 'ბლოგი წარმატებით წაიშალა', 3000, 'success'];
          this.blogsResource.reload();
        }),
        catchError((error) => {
          toastParams = [
            'შეცდომა',
            error.error?.error || 'ბლოგის წაშლა ვერ მოხერხდა',
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
