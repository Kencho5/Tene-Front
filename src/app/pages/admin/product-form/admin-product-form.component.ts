import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, Field, required, min } from '@angular/forms/signals';
import { ToastService } from '@core/services/toast.service';
import { SharedModule } from '@shared/shared.module';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { forkJoin, Observable, of, switchMap } from 'rxjs';
import {
  ProductFormData,
  CreateProductPayload,
  ImageUploadRequest,
} from '@core/interfaces/products.interface';
import { AdminService } from '@core/services/admin/admin.service';
import { ProductsService } from '@core/services/products/products.service';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { getProductImageUrl } from '@utils/product-image-url';

interface SpecificationEntry {
  key: string;
  value: string;
}

interface ImageMetadata {
  color: string;
  is_primary: boolean;
  image_uuid?: string; // Exists for images already on the server
  isExisting?: boolean; // True if this is an existing image, false if newly selected
}

@Component({
  selector: 'app-admin-product-form',
  imports: [SharedModule, InputComponent, Field],
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
  readonly selectedImages = signal<File[]>([]);
  readonly imagePreviewUrls = signal<string[]>([]);
  readonly imageMetadata = signal<ImageMetadata[]>([]);
  readonly imagesToDelete = signal<string[]>([]); // UUIDs of images to delete on submit
  readonly specifications = signal<SpecificationEntry[]>([]);

  readonly productId = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? Number(id) : null;
  });

  readonly product = toSignal(
    toObservable(this.productId).pipe(
      switchMap((id) => (id ? this.productsService.getProduct(id) : of(null))),
    ),
  );

  constructor() {
    effect(() => {
      const response = this.product();
      if (this.isEditMode() && response) {
        const product = response.data;

        this.productModel.set({
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: Number(product.price),
          discount: product.discount ? Number(product.discount) : 0,
          quantity: product.quantity,
          product_type: product.product_type,
          brand: product.brand || '',
          warranty: product.warranty || '',
        });

        if (product.specifications) {
          const specs = Object.entries(product.specifications).map(
            ([key, value]) => ({
              key,
              value: String(value),
            }),
          );
          this.specifications.set(specs);
        }

        if (response.images && response.images.length > 0) {
          const imageUrls = response.images.map((img) =>
            getProductImageUrl(product.id, img.image_uuid),
          );

          const metadata: ImageMetadata[] = response.images.map((img) => ({
            color: img.color || '',
            is_primary: img.is_primary,
            image_uuid: img.image_uuid,
            isExisting: true,
          }));

          this.imagePreviewUrls.set(imageUrls);
          this.imageMetadata.set(metadata);
        }
      }
    });
  }

  readonly isEditMode = computed(() => this.productId() !== null);
  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'პროდუქტის რედაქტირება' : 'ახალი პროდუქტი',
  );

  readonly productModel = signal<ProductFormData>({
    id: null as any,
    name: '',
    description: '',
    price: null as any,
    discount: null as any,
    quantity: null as any,
    product_type: '',
    brand: '',
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
    required(fieldPath.quantity, { message: 'რაოდენობა აუცილებელია' });
    min(fieldPath.quantity, 0, { message: 'რაოდენობა უნდა იყოს 0 ზე მეტი' });
    required(fieldPath.product_type, { message: 'კატეგორია აუცილებელია' });
  });

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
    const validImages = files.filter((file) => file.type.startsWith('image/'));

    if (validImages.length !== files.length) {
      this.toastService.add(
        'შეცდომა',
        'გთხოვთ აირჩიოთ მხოლოდ სურათები',
        3000,
        'error',
      );
      return;
    }

    const currentImages = this.selectedImages();
    const isFirstBatch = currentImages.length === 0;

    const newMetadata: ImageMetadata[] = validImages.map((_, index) => ({
      color: '',
      is_primary: isFirstBatch && index === 0,
      isExisting: false,
    }));

    this.selectedImages.set([...currentImages, ...validImages]);
    this.imageMetadata.set([...this.imageMetadata(), ...newMetadata]);
    this.generateImagePreviews(validImages);
  }

  private generateImagePreviews(files: File[]): void {
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        this.imagePreviewUrls.set([...this.imagePreviewUrls(), url]);
      };
      reader.readAsDataURL(file);
    });
  }

  removeImage(index: number): void {
    const metadata = this.imageMetadata()[index];

    // If it's an existing image, mark it for deletion
    if (metadata.isExisting && metadata.image_uuid) {
      this.imagesToDelete.update((uuids) => [...uuids, metadata.image_uuid!]);
    }

    // Remove locally
    const images = this.selectedImages();
    const previews = this.imagePreviewUrls();
    const allMetadata = this.imageMetadata();

    this.selectedImages.set(images.filter((_, i) => i !== index));
    this.imagePreviewUrls.set(previews.filter((_, i) => i !== index));
    this.imageMetadata.set(allMetadata.filter((_, i) => i !== index));

    const remainingMetadata = allMetadata.filter((_, i) => i !== index);
    if (
      remainingMetadata.length > 0 &&
      !remainingMetadata.some((m) => m.is_primary)
    ) {
      this.setPrimaryImage(0);
    }
  }

  updateImageColor(index: number, color: string): void {
    this.imageMetadata.update((metadata) =>
      metadata.map((m, i) => (i === index ? { ...m, color } : m)),
    );
  }

  setPrimaryImage(index: number): void {
    this.imageMetadata.update((metadata) =>
      metadata.map((m, i) => ({ ...m, is_primary: i === index })),
    );
  }

  addSpecification(): void {
    this.specifications.set([...this.specifications(), { key: '', value: '' }]);
  }

  removeSpecification(index: number): void {
    this.specifications.set(
      this.specifications().filter((_, i) => i !== index),
    );
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

    if (this.productForm().invalid()) {
      const errors = this.productForm().errorSummary();
      const errorMessage =
        errors.length > 0
          ? errors[0].message
          : 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი';

      this.toastService.add(
        'პროდუქტის დამატება ვერ მოხერხდა',
        errorMessage || 'გთხოვთ შეამოწმოთ დეტალები',
        5000,
        'error',
      );
      return;
    }

    // Check if we have at least one image (existing or new)
    const hasImages =
      this.imageMetadata().length > 0 || this.selectedImages().length > 0;
    if (!hasImages && !this.isEditMode()) {
      this.toastService.add(
        'პროდუქტის დამატება ვერ მოხერხდა',
        'გთხოვთ ატვირთოთ მინიმუმ ერთი სურათი',
        5000,
        'error',
      );
      return;
    }

    this.isLoading.set(true);

    const specsObject = this.specifications()
      .filter((spec) => spec.key && spec.value)
      .reduce(
        (acc, spec) => {
          acc[spec.key] = spec.value;
          return acc;
        },
        {} as Record<string, string>,
      );

    const productData = this.productForm().value();
    const payload: CreateProductPayload = {
      id: Number(productData.id) || 0,
      name: productData.name,
      description: productData.description,
      price: Number(productData.price) || 0,
      discount: Number(productData.discount) || 0,
      quantity: Number(productData.quantity) || 0,
      specifications: specsObject,
      product_type: productData.product_type,
      brand: productData.brand,
      warranty: productData.warranty,
    };

    const productRequest = this.isEditMode()
      ? this.adminService.updateProduct(this.productId()!, payload)
      : this.adminService.createProduct(payload);

    productRequest.subscribe({
      next: (response) => {
        const productId = response.data.id;

        // Step 1: Delete images marked for deletion (only in edit mode)
        const deleteOperations = this.isEditMode()
          ? this.imagesToDelete().map((uuid) =>
              this.adminService.deleteProductImage(productId, uuid),
            )
          : [];

        // Step 2: Update metadata for existing images (only in edit mode)
        const updateOperations = this.isEditMode()
          ? this.imageMetadata()
              .filter((meta) => meta.isExisting && meta.image_uuid)
              .map((meta) =>
                this.adminService.updateProductImage(
                  productId,
                  meta.image_uuid!,
                  {
                    color: meta.color || undefined,
                    is_primary: meta.is_primary,
                  },
                ),
              )
          : [];

        // Step 3: Prepare new images for upload
        const allMetadata = this.imageMetadata();
        const newFiles = this.selectedImages();
        const newImageIndices = allMetadata
          .map((meta, index) => ({ meta, index }))
          .filter(({ meta }) => !meta.isExisting)
          .map(({ index }) => index);

        const newImagesWithMetadata = newFiles.map((file, i) => ({
          file,
          metadata: allMetadata[newImageIndices[i]],
        }));

        // Combine delete and update operations
        const allOperations: Observable<unknown>[] = [
          ...deleteOperations,
          ...updateOperations,
        ];

        // Execute delete/update operations first, then upload new images
        const batchOperations$ =
          allOperations.length > 0 ? forkJoin(allOperations) : of([]);

        batchOperations$.subscribe({
          next: () => {
            // If no new images to upload, finish
            if (newImagesWithMetadata.length === 0) {
              this.isLoading.set(false);
              this.toastService.add(
                'წარმატებული',
                this.isEditMode()
                  ? 'პროდუქტი წარმატებით განახლდა'
                  : 'პროდუქტი წარმატებით დაემატა',
                3000,
                'success',
              );
              this.router.navigate(['/admin/products']);
              return;
            }

            // Upload new images
            const imageRequests: ImageUploadRequest[] =
              newImagesWithMetadata.map(({ file, metadata }) => ({
                color: metadata.color,
                is_primary: metadata.is_primary,
                content_type: file.type,
              }));

            this.adminService
              .getPresignedUrls(productId, imageRequests)
              .subscribe({
                next: (presignedResponse) => {
                  const uploads = presignedResponse.images.map(
                    (presignedUrl, index) => {
                      const file = newImagesWithMetadata[index].file;
                      return this.adminService.uploadToS3(
                        presignedUrl.upload_url,
                        file,
                      );
                    },
                  );

                  forkJoin(uploads).subscribe({
                    next: () => {
                      this.isLoading.set(false);
                      this.toastService.add(
                        'წარმატებული',
                        this.isEditMode()
                          ? 'პროდუქტი წარმატებით განახლდა'
                          : 'პროდუქტი წარმატებით დაემატა',
                        3000,
                        'success',
                      );
                      this.router.navigate(['/admin/products']);
                    },
                    error: (error: unknown) => {
                      this.isLoading.set(false);
                      this.toastService.add(
                        'შეცდომა',
                        'სურათების ატვირთვა ვერ მოხერხდა',
                        5000,
                        'error',
                      );
                      console.error('Image upload error:', error);
                    },
                  });
                },
                error: (error: unknown) => {
                  this.isLoading.set(false);
                  this.toastService.add(
                    'შეცდომა',
                    'სურათების მომზადება ვერ მოხერხდა',
                    5000,
                    'error',
                  );
                  console.error('Presigned URL error:', error);
                },
              });
          },
          error: (error: unknown) => {
            this.isLoading.set(false);
            this.toastService.add(
              'შეცდომა',
              'სურათების წაშლა/განახლება ვერ მოხერხდა',
              5000,
              'error',
            );
            console.error('Image delete/update error:', error);
          },
        });
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.toastService.add(
          'შეცდომა',
          'პროდუქტის შექმნა ვერ მოხერხდა',
          5000,
          'error',
        );
        console.error('Product creation error:', error);
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/products']);
  }
}
