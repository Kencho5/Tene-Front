import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, Field, required } from '@angular/forms/signals';
import { ToastService } from '@core/services/toast.service';
import { SharedModule } from '@shared/shared.module';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { catchError, of, switchMap } from 'rxjs';
import { AdminService } from '@core/services/admin/admin.service';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { ComboboxComponent } from '@shared/components/ui/combobox/combobox.component';
import {
  Category,
  CategoryRequest,
} from '@core/interfaces/categories.interface';
import { generateSlug } from '@utils/slug';

interface CategoryFormData {
  name: string;
  slug: string;
  parent_id: number | null;
  description: string;
  display_order: number;
  enabled: boolean;
}

@Component({
  selector: 'app-admin-category-form',
  imports: [SharedModule, InputComponent, Field, ComboboxComponent],
  templateUrl: './admin-category-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCategoryFormComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  readonly submitted = signal(false);
  readonly isLoading = signal(false);
  readonly categoryOptions = signal<ComboboxItems[]>([]);

  readonly categoryId = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? Number(id) : null;
  });

  readonly isEditMode = computed(() => this.categoryId() !== null);
  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'კატეგორიის რედაქტირება' : 'ახალი კატეგორია',
  );

  readonly categoryModel = signal<CategoryFormData>({
    name: '',
    slug: '',
    parent_id: null,
    description: '',
    display_order: null as any,
    enabled: true,
  });

  readonly categoryForm = form(this.categoryModel, (fieldPath) => {
    required(fieldPath.name, { message: 'სახელი აუცილებელია' });
    required(fieldPath.slug, { message: 'სლაგი აუცილებელია' });
  });

  private findCategoryInTree(nodes: any[], id: number): Category | null {
    for (const node of nodes) {
      if (node.id === id) {
        // Convert tree node to category
        return {
          id: node.id,
          name: node.name,
          slug: node.slug,
          parent_id: null, // Will be set properly from tree structure
          description: node.description || null,
          display_order: node.display_order || 0,
          enabled: node.enabled !== undefined ? node.enabled : true,
          created_at: node.created_at || '',
          updated_at: node.updated_at || '',
        };
      }
      if (node.children && node.children.length > 0) {
        const found = this.findCategoryInTree(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  readonly category = toSignal(
    toObservable(this.categoryId).pipe(
      switchMap((id) => {
        if (!id) return of(null);
        return this.adminService.getAdminCategoryTree().pipe(
          switchMap((response) => {
            const category = this.findCategoryInTree(response.categories, id);
            return of(category);
          }),
          catchError(() => of(null)),
        );
      }),
    ),
  );

  constructor() {
    this.loadCategoryOptions();

    effect(() => {
      const categoryData = this.category();
      if (this.isEditMode() && categoryData) {
        this.loadCategoryData(categoryData);
      }
    });
  }

  private loadCategoryOptions(): void {
    this.adminService
      .getAdminCategoryTree()
      .pipe(catchError(() => of({ categories: [] })))
      .subscribe((response) => {
        const options: ComboboxItems[] = [
          { label: 'არცერთი (მთავარი კატეგორია)', value: 'null' },
        ];

        const flattenTree = (
          nodes: any[],
          prefix: string = '',
        ): ComboboxItems[] => {
          let result: ComboboxItems[] = [];
          nodes.forEach((node) => {
            const currentId = this.categoryId();
            if (currentId && node.id === currentId) {
              return;
            }

            result.push({
              label: prefix + node.name,
              value: String(node.id),
            });

            if (node.children && node.children.length > 0) {
              result = result.concat(flattenTree(node.children, prefix + '— '));
            }
          });
          return result;
        };

        options.push(...flattenTree(response.categories));
        this.categoryOptions.set(options);
      });
  }

  private loadCategoryData(category: Category): void {
    this.categoryModel.set({
      name: category.name,
      slug: category.slug,
      parent_id: category.parent_id,
      description: category.description || '',
      display_order: category.display_order,
      enabled: category.enabled,
    });
  }

  onNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const name = input.value;

    if (!this.isEditMode() || !this.categoryForm.slug().value()) {
      const slug = generateSlug(name);
      this.categoryModel.update((model) => ({ ...model, slug }));
    }
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);

    if (!this.validateForm()) {
      return;
    }

    this.isLoading.set(true);

    const payload = this.buildCategoryPayload();
    const categoryRequest = this.isEditMode()
      ? this.adminService.updateCategory(this.categoryId()!, payload)
      : this.adminService.createCategory(payload);

    categoryRequest
      .pipe(
        catchError((error) => {
          this.handleError('კატეგორიის შენახვა ვერ მოხერხდა', error);
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response) {
          this.handleSuccess();
        }
      });
  }

  private validateForm(): boolean {
    if (this.categoryForm().invalid()) {
      const errors = this.categoryForm().errorSummary();
      const errorMessage =
        errors.length > 0 && errors[0].message
          ? errors[0].message
          : 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი';

      this.toastService.add(
        'კატეგორიის დამატება ვერ მოხერხდა',
        errorMessage,
        5000,
        'error',
      );
      return false;
    }

    return true;
  }

  private buildCategoryPayload(): CategoryRequest {
    const formData = this.categoryForm().value();
    const parentIdValue = formData.parent_id;

    return {
      name: formData.name,
      slug: formData.slug,
      parent_id:
        parentIdValue === null || parentIdValue === 0
          ? null
          : Number(parentIdValue),
      description: formData.description || undefined,
      display_order: Number(formData.display_order) || 0,
      enabled: formData.enabled,
    };
  }

  private handleSuccess(): void {
    this.isLoading.set(false);
    this.toastService.add(
      'წარმატებული',
      this.isEditMode()
        ? 'კატეგორია წარმატებით განახლდა'
        : 'კატეგორია წარმატებით დაემატა',
      3000,
      'success',
    );
    this.router.navigate(['/admin/categories']);
  }

  private handleError(message: string, error: unknown): void {
    this.isLoading.set(false);
    this.toastService.add('შეცდომა', message, 5000, 'error');
    console.error(message, error);
  }

  cancel(): void {
    this.router.navigate(['/admin/categories']);
  }

  onParentCategoryChange(value: string | undefined): void {
    const parentId = value === 'null' || !value ? null : Number(value);
    this.categoryModel.update((model) => ({ ...model, parent_id: parentId }));
  }

  getSelectedParentValue(): string {
    const parentId = this.categoryModel().parent_id;
    return parentId === null ? 'null' : String(parentId);
  }

  toggleEnabled(): void {
    this.categoryModel.update((model) => ({
      ...model,
      enabled: !model.enabled,
    }));
  }
}
