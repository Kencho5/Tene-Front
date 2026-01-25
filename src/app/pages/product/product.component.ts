import {
  Component,
  inject,
  signal,
  computed,
  input,
  effect,
  ChangeDetectionStrategy,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SharedModule } from '@shared/shared.module';
import { ActivatedRoute } from '@angular/router';
import { ProductsService } from '@core/services/products/products.service';
import { catchError, of, finalize } from 'rxjs';
import {
  ProductResponse,
  ProductImage,
} from '@core/interfaces/products.interface';
import { ImageComponent } from '@shared/components/ui/image/image.component';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '@shared/components/ui/breadcrumb/breadcrumb.component';
import { environment } from '@environments/environment';
import { CartService } from '@core/services/products/cart.service';
import { SeoService } from '@core/services/seo/seo.service';
import { SchemaService } from '@core/services/seo/schema.service';

type TabName = 'specifications' | 'description';

@Component({
  selector: 'app-product',
  imports: [SharedModule, ImageComponent, BreadcrumbComponent],
  templateUrl: './product.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly productsService = inject(ProductsService);
  private readonly cartService = inject(CartService);
  private readonly seoService = inject(SeoService);
  private readonly schemaService = inject(SchemaService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly product_id = input.required<string>();
  readonly product = signal<ProductResponse | null>(null);

  readonly isLoading = signal(true);
  readonly imageLoading = signal(true);
  readonly selectedColor = signal<string | null>(null);
  readonly selectedImageId = signal<string | null>(null);
  readonly quantity = signal(1);
  readonly activeTab = signal<TabName>('specifications');

  readonly imageBaseUrl = environment.product_image_url;

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => [
    { label: 'მთავარი', route: '/' },
    { label: 'პროდუქცია', route: '/products' },
    { label: 'კაბელები', route: '/products' },
  ]);

  readonly availableColors = computed(() => {
    const product = this.product();
    if (!product) return [];

    const allImages = product.images;
    const uniqueColors = [...new Set(allImages.map((img) => img.color))];
    return uniqueColors;
  });

  readonly finalPrice = computed(() => {
    const product = this.product();
    if (!product) return 0;

    const originalPrice = product.data.price;
    const discountPercent = product.data.discount;

    if (discountPercent === 0) {
      return originalPrice;
    }

    const discountAmount = (originalPrice * discountPercent) / 100;
    const priceAfterDiscount = originalPrice - discountAmount;

    return Math.floor(priceAfterDiscount) + 0.99;
  });

  readonly colorImages = computed(() => {
    const product = this.product();
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
    const resolvedProduct = this.route.snapshot.data['product'];
    if (resolvedProduct) {
      this.product.set(resolvedProduct);
      if (resolvedProduct.images.length) {
        this.initializeImageSelection(resolvedProduct.images);
      }
      this.isLoading.set(false);
    } else {
      const productId = this.route.snapshot.paramMap.get('product_id');
      if (productId) {
        this.fetchProduct(productId);
      }
    }

    effect(() => {
      const product = this.product();
      if (product) {
        this.updateSEO(product);
      }
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
        this.product.set(productResponse);

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

  selectColor(color: string): void {
    this.imageLoading.set(true);
    this.selectedColor.set(color);

    const colorImages = this.product()?.images.filter(
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
    const product = this.product();
    if (!product) return '';

    const productId = product.data.id;
    return `${this.imageBaseUrl}/products/${productId}/${imageId}.jpg`;
  }

  updateProductCount(changeAmount: number): void {
    const product = this.product();
    if (!product) return;

    const maxAvailable = product.data.quantity;
    const currentQuantity = this.quantity();
    const newQuantity = currentQuantity + changeAmount;

    const clampedQuantity = Math.max(1, Math.min(newQuantity, maxAvailable));

    this.quantity.set(clampedQuantity);
  }

  selectTab(tab: TabName): void {
    this.activeTab.set(tab);
  }

  addToCart(): void {
    const productData = this.product();
    const color = this.selectedColor();
    const imageId = this.selectedImageId();

    if (!productData || !color || !imageId) return;

    this.cartService.addItem({
      product: productData.data,
      quantity: this.quantity(),
      selectedColor: color,
      selectedImageId: imageId,
    });

    this.quantity.set(1);
  }

  private updateSEO(product: ProductResponse): void {
    const price = this.finalPrice();
    const imageUrl = this.getImageSrc(
      this.displayImage()?.image_uuid || product.images[0]?.image_uuid || '',
    );

    const productDescription = product.data.description || product.data.name;
    const description =
      productDescription.length > 150
        ? productDescription.substring(0, 147) + '...'
        : productDescription;

    const fullDescription = `${description} ფასი: ${price}₾. სულ: ${product.data.quantity} ცალი. ${product.data.product_type}.`;

    const url = isPlatformBrowser(this.platformId)
      ? window.location.href
      : `https://tene.ge/products/${product.data.id}`;

    this.seoService.setMetaTags({
      title: `${product.data.name} - ${price}₾ | Tene`,
      description: fullDescription,
      image: imageUrl,
      url: url,
      type: 'product',
      keywords: `${product.data.name}, ${product.data.product_type}, USB კაბელი, ტექნიკა`,
    });

    this.schemaService.addProductSchema({
      name: product.data.name,
      description: productDescription,
      image: imageUrl,
      sku: product.data.id.toString(),
      price: price,
      currency: 'GEL',
      availability: product.data.quantity > 0 ? 'InStock' : 'OutOfStock',
      url: url,
    });

    const breadcrumbItems = this.breadcrumbs().map((item) => ({
      name: item.label,
      url: isPlatformBrowser(this.platformId)
        ? `${window.location.origin}${item.route}`
        : `https://tene.ge${item.route}`,
    }));

    this.schemaService.addBreadcrumbSchema(breadcrumbItems);
  }
}
