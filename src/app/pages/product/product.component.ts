import {
  Component,
  inject,
  signal,
  computed,
  input,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Location } from '@angular/common';
import { catchError, of, finalize } from 'rxjs';
import { SharedModule } from '@shared/shared.module';
import { ProductsService } from '@core/services/products/products.service';
import {
  ProductResponse,
  ProductImage,
} from '@core/interfaces/products.interface';
import { ImageComponent } from '@shared/components/ui/image/image.component';
import { environment } from '@environments/environment';
import { CartService } from '@core/services/products/cart.service';

type TabName = 'specifications' | 'description';

@Component({
  selector: 'app-product',
  imports: [SharedModule, ImageComponent],
  templateUrl: './product.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductComponent {
  private readonly location = inject(Location);
  private readonly productsService = inject(ProductsService);
  private readonly cartService = inject(CartService);

  readonly product_id = input.required<string>();
  readonly productData = signal<ProductResponse | null>(null);

  readonly isLoading = signal(true);
  readonly imageLoading = signal(true);
  readonly selectedColor = signal<string | null>(null);
  readonly selectedImageId = signal<string | null>(null);
  readonly quantity = signal(1);
  readonly activeTab = signal<TabName>('specifications');

  readonly imageBaseUrl = environment.product_image_url;

  readonly availableColors = computed(() => {
    const product = this.productData();
    if (!product) return [];

    const allImages = product.images;
    const uniqueColors = [...new Set(allImages.map((img) => img.color))];
    return uniqueColors;
  });

  readonly finalPrice = computed(() => {
    const product = this.productData();
    if (!product) return 0;

    const originalPrice = product.product.price;
    const discountPercent = product.product.discount;

    if (discountPercent === 0) {
      return originalPrice;
    }

    const discountAmount = (originalPrice * discountPercent) / 100;
    const priceAfterDiscount = originalPrice - discountAmount;

    return Math.floor(priceAfterDiscount) + 0.99;
  });

  readonly colorImages = computed(() => {
    const product = this.productData();
    if (!product) return [];

    const allImages = product.images;
    const color = this.selectedColor();

    if (!color) {
      const primaryImage = allImages.find((img) => img.is_primary);
      return primaryImage ? [primaryImage] : allImages.slice(0, 1);
    }

    const imagesMatchingColor = allImages.filter((img) => img.color === color);
    return imagesMatchingColor;
  });

  readonly displayImage = computed(() => {
    const availableImages = this.colorImages();
    const imageId = this.selectedImageId();

    if (imageId) {
      const matchingImage = availableImages.find(
        (img) => img.image_uuid === imageId,
      );
      if (matchingImage) {
        return matchingImage;
      }
    }

    return availableImages[0] || null;
  });

  constructor() {
    effect(() => {
      const productId = this.product_id();
      this.fetchProduct(productId);
    });
  }

  private fetchProduct(productId: string): void {
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
      .subscribe((productResponse) => {
        this.productData.set(productResponse);

        if (productResponse?.images.length) {
          this.initializeImageSelection(productResponse.images);
        }
      });
  }

  private initializeImageSelection(images: ProductImage[]): void {
    const primaryImage = images.find((img) => img.is_primary);

    if (primaryImage) {
      this.selectedImageId.set(primaryImage.image_uuid);
      this.selectedColor.set(primaryImage.color);
    }
  }

  navigateBack(): void {
    this.location.back();
  }

  selectColor(color: string): void {
    this.imageLoading.set(true);
    this.selectedColor.set(color);

    const colorImages = this.productData()?.images.filter(
      (img) => img.color === color,
    );
    if (colorImages && colorImages.length > 0) {
      this.selectedImageId.set(colorImages[0].image_uuid);
    } else {
      this.selectedImageId.set(null);
    }
  }

  selectImage(imageId: string): void {
    this.imageLoading.set(true);
    this.selectedImageId.set(imageId);
  }

  onMainImageLoad(): void {
    this.imageLoading.set(false);
  }

  getImageSrc(imageId: string): string {
    const product = this.productData();
    if (!product) return '';

    const productId = product.product.id;
    return `${this.imageBaseUrl}/products/${productId}/${imageId}.jpg`;
  }

  updateProductCount(changeAmount: number): void {
    const product = this.productData();
    if (!product) return;

    const maxAvailable = product.product.quantity;
    const currentQuantity = this.quantity();
    const newQuantity = currentQuantity + changeAmount;

    const clampedQuantity = Math.max(1, Math.min(newQuantity, maxAvailable));

    this.quantity.set(clampedQuantity);
  }

  selectTab(tab: TabName): void {
    this.activeTab.set(tab);
  }

  addToCart(): void {
    const productData = this.productData();
    const color = this.selectedColor();
    const imageId = this.selectedImageId();

    if (!productData || !color || !imageId) return;

    this.cartService.addItem({
      product: productData.product,
      quantity: this.quantity(),
      selectedColor: color,
      selectedImageId: imageId,
    });

    this.quantity.set(1);
  }
}
