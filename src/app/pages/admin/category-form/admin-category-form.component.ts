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
import { catchError, Observable, of, switchMap } from 'rxjs';
import { AdminService } from '@core/services/admin/admin.service';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { ComboboxComponent } from '@shared/components/ui/combobox/combobox.component';
import {
  Category,
  CategoryRequest,
} from '@core/interfaces/categories.interface';
import { generateSlug } from '@utils/slug';
import { flattenCategoryTree, addNoneOption } from '@utils/category';

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
  readonly imagePreview = signal<string | null>(null);
  readonly imageFile = signal<File | null>(null);
  readonly existingImageUuid = signal<string | null>(null);

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
          image_url: node.image_url || null,
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
        // Flatten the tree and filter out the current category (when editing)
        const currentId = this.categoryId();
        const filteredCategories = currentId
          ? this.filterOutCategory(response.categories, currentId)
          : response.categories;

        const flattenedCategories = flattenCategoryTree(filteredCategories);
        const options = addNoneOption(flattenedCategories);

        this.categoryOptions.set(options);
      });
  }

  private filterOutCategory(nodes: any[], excludeId: number): any[] {
    return nodes
      .filter((node) => node.id !== excludeId)
      .map((node) => ({
        ...node,
        children: node.children
          ? this.filterOutCategory(node.children, excludeId)
          : [],
      }));
  }

  generateSlugFromName(): void {
    const name = this.categoryForm.name().value();
    if (name) {
      const slug = generateSlug(name);
      this.categoryModel.update((model) => ({ ...model, slug }));
    }
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

    // Load existing image if present
    if (category.image_url) {
      this.imagePreview.set(category.image_url);
      // Extract UUID from URL if needed for deletion
      const urlParts = category.image_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const uuid = fileName.split('.')[0];
      this.existingImageUuid.set(uuid);
    }
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
        switchMap((response) => {
          if (!response) return of(null);
          return this.handleImageOperations(response.id).pipe(
            switchMap(() => of(response))
          );
        }),
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
    if (parentId === null) return 'null';

    // Find the item with this ID and return its full value (depth:id)
    const item = this.categoryOptions().find(opt => {
      const actualId = opt.value.split(':')[1] || opt.value;
      return actualId === String(parentId);
    });

    return item ? item.value : String(parentId);
  }

  toggleEnabled(): void {
    this.categoryModel.update((model) => ({
      ...model,
      enabled: !model.enabled,
    }));
  }

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.toastService.add(
        'შეცდომა',
        'გთხოვთ აირჩიოთ მხოლოდ სურათი',
        3000,
        'error',
      );
      return;
    }

    this.imageFile.set(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.imageFile.set(null);
    this.imagePreview.set(null);
    this.existingImageUuid.set(null);
  }

  private handleImageOperations(categoryId: number): Observable<unknown> {
    const imageFile = this.imageFile();
    const existingUuid = this.existingImageUuid();

    // If image was removed and there was an existing one, delete it
    if (!this.imagePreview() && existingUuid) {
      return this.adminService.deleteCategoryImage(categoryId, existingUuid).pipe(
        catchError((error) => {
          console.error('Image delete error:', error);
          return of(null);
        }),
      );
    }

    // If no new image to upload, skip
    if (!imageFile) {
      return of(null);
    }

    // Upload new image
    return this.adminService
      .getCategoryImagePresignedUrl(categoryId, {
        content_type: imageFile.type,
      })
      .pipe(
        switchMap((presignedResponse) =>
          this.adminService.uploadToS3(presignedResponse.upload_url, imageFile),
        ),
        catchError((error) => {
          this.handleError('სურათის ატვირთვა ვერ მოხერხდა', error);
          return of(null);
        }),
      );
  }
}
