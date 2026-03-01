import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField, required, min } from '@angular/forms/signals';
import { ToastService } from '@core/services/toast.service';
import { SharedModule } from '@shared/shared.module';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { catchError, forkJoin, Observable, of, switchMap } from 'rxjs';
import { Product, ProductCategory, ProductImage } from '@core/interfaces/products.interface';
import {
  ProductFormData,
  CreateProductPayload,
  ImageUploadRequest,
} from '@core/interfaces/admin/products.interface';
import { AdminService } from '@core/services/admin/admin.service';
import { ProductsService } from '@core/services/products/products.service';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { getProductImageUrl } from '@utils/product-image-url';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { ComboboxComponent } from '@shared/components/ui/combobox/combobox.component';
import { flattenCategoryTree } from '@utils/category';
import { colorLabels } from '@utils/colors';
import { Brand } from '@core/interfaces/admin/brands.interface';

interface SpecificationEntry {
  key: string;
  value: string;
}

interface ImageWithMetadata {
  file?: File;
  previewUrl: string;
  color: string;
  isPrimary: boolean;
  quantity: number;
  uuid?: string;
  isExisting: boolean;
}

@Component({
  selector: 'app-admin-product-form',
  imports: [SharedModule, InputComponent, FormField, ComboboxComponent],
  templateUrl: './admin-product-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProductFormComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly adminService = inject(AdminService);
  private readonly productsService = inject(ProductsService);
  private readonly toastService = inject(ToastService);

  readonly submitted = signal(false);
  readonly isLoading = signal(false);
  readonly images = signal<ImageWithMetadata[]>([]);
  readonly specifications = signal<SpecificationEntry[]>([]);
  readonly selectedCategoryIds = signal<number[]>([]);
  readonly categoryOptions = signal<ComboboxItems[]>([]);

  readonly colorOptions: ComboboxItems[] = Object.entries(colorLabels).map(([value, label]) => ({
    label,
    value,
  }));

  readonly brandOptions = signal<ComboboxItems[]>([]);

  readonly productId = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? Number(id) : null;
  });

  readonly isEditMode = computed(() => this.productId() !== null);
  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'პროდუქტის რედაქტირება' : 'ახალი პროდუქტი',
  );

  readonly product = toSignal(
    toObservable(this.productId).pipe(
      switchMap((id) =>
        id
          ? this.productsService.getProduct(id).pipe(
              switchMap((response) => {
                return of(response);
              }),
            )
          : of(null),
      ),
    ),
  );

  readonly imagePreviewUrls = computed(() => this.images().map((img) => img.previewUrl));

  readonly imageMetadata = computed(() =>
    this.images().map((img) => ({
      color: img.color,
      is_primary: img.isPrimary,
      quantity: img.quantity,
      image_uuid: img.uuid,
      isExisting: img.isExisting,
    })),
  );

  readonly productModel = signal<ProductFormData>({
    id: null as any,
    name: '',
    description: '',
    price: null as any,
    discount: null as any,
    brand_id: null as any,
    warranty: '',
  });

  readonly productForm = form(this.productModel, (fieldPath) => {
    required(fieldPath.id, { message: 'ID აუცილებელია' });
    required(fieldPath.name, { message: 'სახელი აუცილებელია' });
    required(fieldPath.price, { message: 'ფასი აუცილებელია' });
    min(fieldPath.price, 0, { message: 'ფასი უნდა იყოს დადებითი' });
    min(fieldPath.discount, 0, {
      message: 'ფასდაკლება უნდა იყოს 0-დან 100-მდე',
    });
  });

  constructor() {
    this.loadCategoryOptions();
    this.loadBrandOptions();

    effect(() => {
      const response = this.product();
      if (this.isEditMode() && response) {
        this.loadProductData(response.data, response.images, response.categories);
      }
    });
  }

  private loadBrandOptions(): void {
    this.adminService
      .getBrands()
      .pipe(catchError(() => of([] as Brand[])))
      .subscribe((brands) => {
        this.brandOptions.set(
          brands.map((b) => ({ label: b.name, value: String(b.id) })),
        );
      });
  }

  private loadCategoryOptions(): void {
    this.adminService
      .getAdminCategoryTree()
      .pipe(catchError(() => of({ categories: [] })))
      .subscribe((response) => {
        const flattenedCategories = flattenCategoryTree(response.categories);
        this.categoryOptions.set(flattenedCategories);

        const response_data = this.product();
        if (
          this.isEditMode() &&
          response_data &&
          response_data.categories &&
          response_data.categories.length > 0
        ) {
          this.selectedCategoryIds.set([response_data.categories[0].id]);
        }
      });
  }

  private loadProductData(
    product: Product,
    productImages: ProductImage[],
    categories: ProductCategory[],
  ): void {
    this.productModel.set({
      id: product.id,
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      discount: product.discount,
      brand_id: product.brand_id,
      warranty: product.warranty,
    });
    if (this.categoryOptions().length > 0 && categories.length > 0) {
      this.selectedCategoryIds.set([categories[0].id]);
    }

    if (product.specifications) {
      const specs = Object.entries(product.specifications).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      this.specifications.set(specs);
    }

    if (productImages.length > 0) {
      const loadedImages: ImageWithMetadata[] = productImages.map((img) => ({
        previewUrl: getProductImageUrl(product.id, img.image_uuid, img.extension),
        color: img.color || '',
        isPrimary: img.is_primary,
        quantity: img.quantity ?? 0,
        uuid: img.image_uuid,
        isExisting: true,
      }));
      this.images.set(loadedImages);
    }
  }

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
    const validImages = files.filter((file) => file.type.startsWith('image/'));

    if (validImages.length !== files.length) {
      this.toastService.add('შეცდომა', 'გთხოვთ აირჩიოთ მხოლოდ სურათები', 3000, 'error');
      return;
    }

    const currentImages = this.images();
    const isFirstBatch = currentImages.length === 0;

    validImages.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage: ImageWithMetadata = {
          file,
          previewUrl: e.target?.result as string,
          color: '',
          isPrimary: isFirstBatch && index === 0,
          quantity: null as any,
          isExisting: false,
        };
        this.images.update((imgs) => [...imgs, newImage]);
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number): void {
    this.images.update((imgs) => {
      const updated = imgs.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return updated;
    });
  }

  updateImageColor(index: number, color: string): void {
    this.images.update((imgs) => imgs.map((img, i) => (i === index ? { ...img, color } : img)));
  }

  updateImageQuantity(index: number, quantity: number): void {
    this.images.update((imgs) =>
      imgs.map((img, i) => (i === index ? { ...img, quantity: Math.max(0, quantity) } : img)),
    );
  }

  setPrimaryImage(index: number): void {
    this.images.update((imgs) => imgs.map((img, i) => ({ ...img, isPrimary: i === index })));
  }

  addSpecification(): void {
    this.specifications.update((specs) => [...specs, { key: '', value: '' }]);
  }

  removeSpecification(index: number): void {
    this.specifications.update((specs) => specs.filter((_, i) => i !== index));
  }

  updateSpecificationKey(index: number, key: string): void {
    this.specifications.update((specs) =>
      specs.map((spec, i) => (i === index ? { ...spec, key } : spec)),
    );
  }

  updateSpecificationValue(index: number, value: string): void {
    this.specifications.update((specs) =>
      specs.map((spec, i) => (i === index ? { ...spec, value } : spec)),
    );
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);

    if (!this.validateForm()) {
      return;
    }

    this.isLoading.set(true);

    const payload = this.buildProductPayload();
    const productRequest = this.isEditMode()
      ? this.adminService.updateProduct(this.productId()!, payload)
      : this.adminService.createProduct(payload);

    productRequest
      .pipe(
        switchMap((response) =>
          this.handleImageOperations(response.data.id).pipe(
            switchMap(() =>
              this.assignCategories(response.data.id).pipe(switchMap(() => of(response))),
            ),
          ),
        ),
        catchError((error) => {
          this.handleError('პროდუქტის შექმნა ვერ მოხერხდა', error);
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
    if (this.productForm().invalid()) {
      const errors = this.productForm().errorSummary();
      const errorMessage =
        errors.length > 0 && errors[0].message
          ? errors[0].message
          : 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი';

      this.toastService.add('პროდუქტის დამატება ვერ მოხერხდა', errorMessage, 5000, 'error');
      return false;
    }

    if (!this.isEditMode() && this.images().length === 0) {
      this.toastService.add(
        'პროდუქტის დამატება ვერ მოხერხდა',
        'გთხოვთ ატვირთოთ მინიმუმ ერთი სურათი',
        5000,
        'error',
      );
      return false;
    }

    return true;
  }

  private buildProductPayload(): CreateProductPayload {
    const productData = this.productForm().value();
    const specifications = this.specifications()
      .filter((spec) => spec.key && spec.value)
      .reduce(
        (acc, spec) => {
          acc[spec.key] = spec.value;
          return acc;
        },
        {} as Record<string, string>,
      );

    return {
      id: Number(productData.id) || 0,
      name: productData.name,
      description: productData.description,
      price: Number(productData.price) || 0,
      discount: Number(productData.discount) || 0,
      specifications,
      brand_id: productData.brand_id ? Number(productData.brand_id) : null,
      warranty: productData.warranty,
    };
  }

  private handleImageOperations(productId: number): Observable<unknown> {
    const images = this.images();
    const existingImages = images.filter((img) => img.isExisting);
    const newImages = images.filter((img) => !img.isExisting);
    const deletedImages = this.getDeletedImages(existingImages);

    const deleteOps = deletedImages.map((uuid) =>
      this.adminService.deleteProductImage(productId, uuid).pipe(
        catchError((error) => {
          console.error('Image delete error:', error);
          return of(null);
        }),
      ),
    );

    const updateOps = existingImages.map((img) =>
      this.adminService
        .updateProductImage(productId, img.uuid!, {
          color: img.color || undefined,
          is_primary: img.isPrimary,
          quantity: img.quantity,
        })
        .pipe(
          catchError((error) => {
            console.error('Image update error:', error);
            return of(null);
          }),
        ),
    );

    const allOps = [...deleteOps, ...updateOps];

    if (newImages.length === 0) {
      return allOps.length > 0 ? forkJoin(allOps) : of([]);
    }

    return (allOps.length > 0 ? forkJoin(allOps) : of([])).pipe(
      switchMap(() => this.uploadNewImages(productId, newImages)),
    );
  }

  private getDeletedImages(currentExistingImages: ImageWithMetadata[]): string[] {
    const productResponse = this.product();
    if (!productResponse?.images) return [];

    const currentUuids = new Set(currentExistingImages.map((img) => img.uuid).filter(Boolean));
    return productResponse.images
      .filter((img) => !currentUuids.has(img.image_uuid))
      .map((img) => img.image_uuid);
  }

  private uploadNewImages(productId: number, newImages: ImageWithMetadata[]): Observable<unknown> {
    const imageRequests: ImageUploadRequest[] = newImages.map((img) => ({
      color: img.color,
      is_primary: img.isPrimary,
      content_type: img.file!.type,
      quantity: img.quantity,
    }));

    return this.adminService.getPresignedUrls(productId, imageRequests).pipe(
      switchMap((presignedResponse) => {
        const uploads = presignedResponse.images.map((presignedUrl, index) =>
          this.adminService.uploadToS3(presignedUrl.upload_url, newImages[index].file!),
        );
        return uploads.length > 0 ? forkJoin(uploads) : of([]);
      }),
      catchError((error) => {
        this.handleError('სურათების ატვირთვა ვერ მოხერხდა', error);
        return of(null);
      }),
    );
  }

  private handleSuccess(): void {
    this.isLoading.set(false);
    this.toastService.add(
      'წარმატებული',
      this.isEditMode() ? 'პროდუქტი წარმატებით განახლდა' : 'პროდუქტი წარმატებით დაემატა',
      3000,
      'success',
    );
    this.router.navigate(['/admin/products']);
  }

  private handleError(message: string, error: unknown): void {
    this.isLoading.set(false);
    this.toastService.add('შეცდომა', message, 5000, 'error');
    console.error(message, error);
  }

  private assignCategories(productId: number): Observable<unknown> {
    const categoryIds = this.selectedCategoryIds();
    if (categoryIds.length === 0) {
      return of(null);
    }

    return this.adminService.assignProductCategories(productId, categoryIds).pipe(
      catchError((error) => {
        console.error('Category assignment error:', error);
        return of(null);
      }),
    );
  }

  toggleCategory(categoryId: string): void {
    const id = Number(categoryId);
    this.selectedCategoryIds.update((ids) => {
      if (ids.includes(id)) {
        return ids.filter((i) => i !== id);
      } else {
        return [...ids, id];
      }
    });
  }

  isCategorySelected(categoryId: string): boolean {
    return this.selectedCategoryIds().includes(Number(categoryId));
  }

  getSelectedCategoryValue(): string | undefined {
    const selectedIds = this.selectedCategoryIds();
    if (selectedIds.length === 0) return undefined;

    const categoryId = selectedIds[0];
    const options = this.categoryOptions();

    const option = options.find((opt) => opt.value.split(':')[1] === String(categoryId));

    return option?.value;
  }

  onCategoryChange(categoryId: string | undefined): void {
    if (categoryId) {
      this.selectedCategoryIds.set([Number(categoryId)]);
    } else {
      this.selectedCategoryIds.set([]);
    }
  }

  getSelectedBrandValue(): string | undefined {
    const brandId = this.productModel().brand_id;
    return brandId ? String(brandId) : undefined;
  }

  onBrandChange(value: string | undefined): void {
    this.productModel.update((m) => ({
      ...m,
      brand_id: value ? Number(value) : null,
    }));
  }

  cancel(): void {
    this.router.navigate(['/admin/products']);
  }
}
