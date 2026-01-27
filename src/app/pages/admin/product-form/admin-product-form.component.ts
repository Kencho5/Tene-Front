import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, Field, required, min } from '@angular/forms/signals';
import { ProductsService } from '@core/services/products/products.service';
import { ToastService } from '@core/services/toast.service';
import { SharedModule } from '@shared/shared.module';
import { InputComponent } from '@shared/components/ui/input/input.component';

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  discount: number;
  quantity: number;
  product_type: string;
  brand: string;
  warranty: string;
}

interface SpecificationEntry {
  key: string;
  value: string;
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
  private readonly productsService = inject(ProductsService);
  private readonly toastService = inject(ToastService);

  readonly submitted = signal(false);
  readonly isLoading = signal(false);
  readonly selectedImages = signal<File[]>([]);
  readonly imagePreviewUrls = signal<string[]>([]);
  readonly specifications = signal<SpecificationEntry[]>([]);

  readonly productId = computed(() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? Number(id) : null;
  });

  readonly isEditMode = computed(() => this.productId() !== null);
  readonly pageTitle = computed(() =>
    this.isEditMode() ? 'პროდუქტის რედაქტირება' : 'ახალი პროდუქტი'
  );

  readonly productModel = signal<ProductFormData>({
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
    required(fieldPath.name, { message: 'სახელი აუცილებელია' });
    required(fieldPath.price, { message: 'ფასი აუცილებელია' });
    min(fieldPath.price, 0, { message: 'ფასი უნდა იყოს დადებითი' });
    min(fieldPath.discount, 0, { message: 'ფასდაკლება უნდა იყოს 0-დან 100-მდე' });
    min(fieldPath.quantity, 0, { message: 'რაოდენობა უნდა იყოს დადებითი' });
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

    this.selectedImages.set([...this.selectedImages(), ...validImages]);
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
    const images = this.selectedImages();
    const previews = this.imagePreviewUrls();

    this.selectedImages.set(images.filter((_, i) => i !== index));
    this.imagePreviewUrls.set(previews.filter((_, i) => i !== index));
  }

  addSpecification(): void {
    this.specifications.set([...this.specifications(), { key: '', value: '' }]);
  }

  removeSpecification(index: number): void {
    this.specifications.set(this.specifications().filter((_, i) => i !== index));
  }

  updateSpecificationKey(index: number, key: string): void {
    this.specifications.update((specs) =>
      specs.map((spec, i) => (i === index ? { ...spec, key } : spec))
    );
  }

  updateSpecificationValue(index: number, value: string): void {
    this.specifications.update((specs) =>
      specs.map((spec, i) => (i === index ? { ...spec, value } : spec))
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

    if (this.selectedImages().length === 0 && !this.isEditMode()) {
      this.toastService.add(
        'პროდუქტის დამატება ვერ მოხერხდა',
        'გთხოვთ ატვირთოთ მინიმუმ ერთი სურათი',
        5000,
        'error',
      );
      return;
    }

    this.isLoading.set(true);

    const formData = new FormData();
    const productData = this.productForm().value();

    Object.entries(productData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    // Convert specifications array to JSONB object
    const specsObject = this.specifications()
      .filter((spec) => spec.key && spec.value)
      .reduce((acc, spec) => {
        acc[spec.key] = spec.value;
        return acc;
      }, {} as Record<string, string>);

    formData.append('specifications', JSON.stringify(specsObject));

    this.selectedImages().forEach((file) => {
      formData.append('images', file);
    });

    // TODO: Implement actual API call
    console.log('Form submitted:', productData);
    console.log('Specifications:', specsObject);
    console.log('Images:', this.selectedImages());

    // Simulate API call
    setTimeout(() => {
      this.isLoading.set(false);
      this.router.navigate(['/admin/products']);
    }, 1000);
  }

  cancel(): void {
    this.router.navigate(['/admin/products']);
  }
}
