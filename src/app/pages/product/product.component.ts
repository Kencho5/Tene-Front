import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { catchError, of, finalize } from 'rxjs';
import { SharedModule } from '@shared/shared.module';
import { ProductsService } from '@core/services/products.service';
import { ProductResponse } from '@core/interfaces/products.interface';
import { ImageComponent } from '@shared/components/ui/image/image.component';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-product',
  imports: [SharedModule, ImageComponent],
  templateUrl: './product.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductComponent implements OnInit {
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  private readonly productsService = inject(ProductsService);

  readonly product = signal<ProductResponse | null>(null);
  readonly isLoading = signal(true);
  readonly selectedColor = signal<string | null>(null);
  readonly selectedImageUuid = signal<string | null>(null);
  readonly productCount = signal(1);

  readonly availableColors = computed(() => {
    return this.product()?.product.colors ?? [];
  });

  readonly colorImages = computed(() => {
    const images = this.product()?.images ?? [];
    const color = this.selectedColor();

    if (!color) {
      const primaryImage = images.find((img) => img.is_primary);
      return primaryImage ? [primaryImage] : images.slice(0, 1);
    }

    return images.filter((img) => img.color === color);
  });

  readonly displayImage = computed(() => {
    const uuid = this.selectedImageUuid();
    const images = this.colorImages();

    if (uuid) {
      const found = images.find((img) => img.image_uuid === uuid);
      if (found) return found;
    }

    return images[0] || null;
  });

  readonly imageUrl = environment.product_image_url;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.loadProduct(params['product_id']);
    });
  }

  private loadProduct(productId: string): void {
    this.isLoading.set(true);

    this.productsService
      .getProduct(productId)
      .pipe(
        catchError((error) => {
          console.error('Failed to load product:', error);
          return of(null);
        }),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((product) => {
        this.product.set(product);
        if (product?.images.length) {
          const primaryImage = product.images.find((img) => img.is_primary);
          if (primaryImage) {
            this.selectedColor.set(primaryImage.color);
          }
        }
      });
  }

  navigateBack(): void {
    this.location.back();
  }

  selectColor(color: string): void {
    this.selectedColor.set(color);
    this.selectedImageUuid.set(null);
  }

  selectImage(imageUuid: string): void {
    this.selectedImageUuid.set(imageUuid);
  }

  getImageSrc(image_uuid: string): string {
    const productId = this.product()?.product.id;
    return `${this.imageUrl}/products/${productId}/${image_uuid}.jpg`;
  }

  updateProductCount(delta: number): void {
    const maxQuantity = this.product()?.product.quantity ?? 1;
    this.productCount.update((current) =>
      Math.max(1, Math.min(current + delta, maxQuantity)),
    );
  }

  get discountedPrice(): number {
    const product = this.product()!.product;
    const discounted =
      product.price - (product.price * product?.discount) / 100;
    return Math.floor(discounted) + 0.99;
  }
}
