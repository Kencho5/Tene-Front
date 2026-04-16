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
import { ProductsService } from '@core/services/products/products.service';
import { catchError, of, map } from 'rxjs';
import { rxResource } from '@angular/core/rxjs-interop';
import { ProductResponse, ProductImage } from '@core/interfaces/products.interface';
import { ImageComponent } from '@shared/components/ui/image/image.component';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '@shared/components/ui/breadcrumb/breadcrumb.component';
import { CartService } from '@core/services/products/cart.service';
import { SeoService } from '@core/services/seo/seo.service';
import { SchemaService } from '@core/services/seo/schema.service';
import { getProductImageBaseUrl, getProductImageUrl } from '@utils/product-image-url';
import { CategoriesService } from '@core/services/categories/categories.service';
import { CategoryTreeNode } from '@core/interfaces/categories.interface';
import { DragScrollDirective } from '@core/directives/drag-scroll.directive';
import { ProductCardComponent } from '@shared/components/ui/product-card/product-card.component';
import { ProductCardSkeletonComponent } from '@shared/components/ui/product-card-skeleton/product-card-skeleton.component';
import { AuthService } from '@core/services/auth/auth-service.service';
import { ToastService } from '@core/services/toast.service';
import {
  LightboxComponent,
  LightboxImage,
} from '@shared/components/ui/lightbox/lightbox.component';

type TabName = 'specifications' | 'description';

@Component({
  selector: 'app-product',
  imports: [
    SharedModule,
    ImageComponent,
    BreadcrumbComponent,
    ProductCardComponent,
    ProductCardSkeletonComponent,
    DragScrollDirective,
    LightboxComponent,
  ],
  templateUrl: './product.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductComponent {
  private readonly productsService = inject(ProductsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly categoryTree = rxResource({
    defaultValue: [] as CategoryTreeNode[],
    stream: () =>
      this.categoriesService.getCategoryTree().pipe(
        map((res) => res.categories),
        catchError(() => of([] as CategoryTreeNode[])),
      ),
  });
  private readonly seoService = inject(SeoService);
  private readonly schemaService = inject(SchemaService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly product_id = input.required<string>();
  readonly slug = input.required<string>();

  readonly productResource = rxResource({
    defaultValue: null as ProductResponse | null,
    params: () => this.product_id(),
    stream: ({ params: productId }) => {
      if (!productId) return of(null as ProductResponse | null);
      return this.productsService.getProduct(productId).pipe(
        catchError((error) => {
          console.error('Failed to load product:', error);
          return of(null as ProductResponse | null);
        }),
      );
    },
  });

  readonly product = computed(() => this.productResource.value());

  readonly imageLoading = signal(true);
  readonly selectedColor = signal<string | null>(null);
  readonly selectedImageId = signal<string | null>(null);
  readonly quantity = signal(1);
  readonly activeTab = signal<TabName>('specifications');
  readonly swipeOffset = signal(0);
  readonly lightboxOpen = signal(false);

  private touchStartX = 0;
  private touchStartY = 0;
  private isSwiping = false;

  readonly currentImageIndex = computed(() => {
    const images = this.colorImages();
    const currentId = this.selectedImageId();
    return images.findIndex((img) => img.image_uuid === currentId);
  });

  readonly lightboxImages = computed<LightboxImage[]>(() => {
    const product = this.product();
    const images = this.colorImages();
    if (!product || !images.length) return [];

    return images.map((img) => ({
      id: img.image_uuid,
      src: getProductImageUrl(product.data.id, img.image_uuid, img.extension),
      alt: product.data.name + ' - ' + img.color,
    }));
  });

  readonly canGoPrev = computed(() => this.currentImageIndex() > 0);
  readonly canGoNext = computed(() => {
    const images = this.colorImages();
    return this.currentImageIndex() < images.length - 1;
  });

  readonly relatedProducts = rxResource({
    defaultValue: [] as ProductResponse[],
    params: () => this.product()?.data.id,
    stream: ({ params: productId }) => {
      if (!productId) return of([] as ProductResponse[]);
      return this.productsService
        .getRelatedProducts(productId)
        .pipe(catchError(() => of([] as ProductResponse[])));
    },
  });

  readonly selectedImageQuantity = computed(() => {
    return this.displayImage()?.quantity ?? 0;
  });

  readonly hasSpecifications = computed(() => {
    const product = this.product();
    if (!product) return false;
    const specs = product.data.specifications;
    return specs && typeof specs === 'object' && Object.keys(specs).length > 0;
  });

  readonly imageBaseUrl = getProductImageBaseUrl();

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const product = this.product();
    const base: BreadcrumbItem[] = [];

    if (!product) return base;

    const productCategoryIds = new Set((product.categories ?? []).map((c) => c.id));
    const tree = this.categoryTree.value() ?? [];

    const findPath = (
      nodes: CategoryTreeNode[],
      path: CategoryTreeNode[],
    ): CategoryTreeNode[] | null => {
      for (const node of nodes) {
        const current = [...path, node];
        if (productCategoryIds.has(node.id)) return current;
        const found = findPath(node.children, current);
        if (found) return found;
      }
      return null;
    };

    const categoryPath = findPath(tree, []);
    if (categoryPath) {
      for (let i = 0; i < categoryPath.length; i++) {
        const node = categoryPath[i];
        const isLast = i === categoryPath.length - 1;
        const paramKey =
          isLast && categoryPath.length > 1 ? 'child_category_id' : 'parent_category_id';
        base.push({ label: node.name, route: '/search', queryParams: { [paramKey]: node.id } });
      }
    }

    base.push({ label: product.data.name });

    return base;
  });

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
      const matchingImage = availableImages.find((img) => img.image_uuid === imageId);
      if (matchingImage) {
        return matchingImage;
      }
    }

    return availableImages[0] || null;
  });

  constructor() {
    // Initialize image selection when product loads
    effect(() => {
      const product = this.product();
      if (!product) return;

      if (product.images.length) {
        this.initializeImageSelection(product.images);
      }
    });

    effect(() => {
      const product = this.product();
      if (!product) return;
      const slug = this.slug();
      this.categoryTree.value(); // re-run when tree loads for accurate breadcrumb schema
      this.updateSEO(product, slug);
    });

    effect(() => {
      const product = this.product();
      if (!product) return;
      if (!this.hasSpecifications()) {
        this.activeTab.set('description');
      }
    });

    effect(() => {
      const product = this.product();
      if (!product || !isPlatformBrowser(this.platformId)) return;
      const userId = this.authService.user()?.user_id ?? null;
      this.productsService.addProductViews(product.data.id, userId).subscribe();
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
    if (this.selectedColor() === color) return;

    this.imageLoading.set(true);
    this.selectedColor.set(color);
    this.quantity.set(1);

    const colorImages = this.product()?.images.filter((img) => img.color === color);
    if (colorImages && colorImages.length > 0) {
      this.selectedImageId.set(colorImages[0].image_uuid);
    } else {
      this.selectedImageId.set(null);
    }
  }

  selectImage(imageId: string): void {
    if (this.selectedImageId() === imageId) return;
    this.imageLoading.set(true);
    this.selectedImageId.set(imageId);
  }

  onMainImageLoad(): void {
    this.imageLoading.set(false);
  }

  getImageSrc(imageId: string): string {
    const product = this.product();
    if (!product) return '';

    const image = product.images.find((img) => img.image_uuid === imageId);
    if (!image) return '';

    return getProductImageUrl(product.data.id, imageId, image.extension);
  }

  updateProductCount(changeAmount: number): void {
    const maxAvailable = this.selectedImageQuantity();
    const currentQuantity = this.quantity();
    const newQuantity = currentQuantity + changeAmount;

    const clampedQuantity = Math.max(1, Math.min(newQuantity, maxAvailable));

    this.quantity.set(clampedQuantity);
  }

  selectTab(tab: TabName): void {
    this.activeTab.set(tab);
  }

  decodeHtml(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  goToPrevImage(): void {
    const images = this.colorImages();
    const idx = this.currentImageIndex();
    if (idx > 0) {
      this.selectImage(images[idx - 1].image_uuid);
    }
  }

  goToNextImage(): void {
    const images = this.colorImages();
    const idx = this.currentImageIndex();
    if (idx < images.length - 1) {
      this.selectImage(images[idx + 1].image_uuid);
    }
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.isSwiping = false;
  }

  onTouchMove(event: TouchEvent): void {
    const deltaX = event.touches[0].clientX - this.touchStartX;
    const deltaY = event.touches[0].clientY - this.touchStartY;

    // Only start swiping if horizontal movement exceeds vertical
    if (!this.isSwiping && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      this.isSwiping = true;
    }

    if (this.isSwiping) {
      event.preventDefault();
      this.swipeOffset.set(deltaX);
    }
  }

  onTouchEnd(): void {
    const offset = this.swipeOffset();
    const threshold = 50;

    if (offset < -threshold) {
      this.goToNextImage();
    } else if (offset > threshold) {
      this.goToPrevImage();
    }

    this.swipeOffset.set(0);
    this.isSwiping = false;
  }

  openLightbox(): void {
    this.lightboxOpen.set(true);
  }

  closeLightbox(): void {
    this.lightboxOpen.set(false);
  }

  onLightboxImageChange(imageId: string): void {
    this.selectImage(imageId);
  }

  addToCart(): void {
    const productData = this.product();
    const color = this.selectedColor();
    const imageId = this.selectedImageId();

    if (!productData || !color || !imageId) return;

    const selectedImage = productData.images.find((img) => img.image_uuid === imageId);
    if (!selectedImage) return;

    this.cartService.addItem({
      product: productData.data,
      quantity: this.quantity(),
      selectedColor: color,
      selectedImageId: imageId,
      selectedImageExtension: selectedImage.extension,
      selectedImageQuantity: selectedImage.quantity,
    });

    this.toastService.add(
      'კალათაში დაემატა',
      productData.data.name,
      2500,
      'success',
    );

    this.quantity.set(1);
  }

  private updateSEO(product: ProductResponse, slug: string): void {
    const price = this.finalPrice();
    const image = product.images?.[0];
    if (!image) return;
    const imageUrl = getProductImageUrl(product.data.id, image.image_uuid, image.extension);

    const productDescription = product.data.description || product.data.name;
    const description =
      productDescription.length > 150
        ? productDescription.substring(0, 147) + '...'
        : productDescription;

    const fullDescription = `${description} ფასი: ${price}₾. სულ: ${product.data.quantity} ცალი.`;

    // Always use the canonical URL with slug for SEO
    const canonicalUrl = `https://tene.ge/products/${slug}/${product.data.id}`;

    const categoryKeyword =
      product.data.categories && product.data.categories.length > 0
        ? product.data.categories[0].name
        : 'პროდუქტი';

    this.seoService.setMetaTags({
      title: `${product.data.name} - ${price}₾ | Tene`,
      description: fullDescription,
      image: imageUrl,
      url: canonicalUrl,
      type: 'product',
      keywords: `${product.data.name}, ${categoryKeyword}, ტექნიკა`,
    });

    this.schemaService.addProductSchema({
      name: product.data.name,
      description: productDescription,
      image: imageUrl,
      sku: product.data.id.toString(),
      price: price,
      currency: 'GEL',
      availability: product.data.quantity > 0 ? 'InStock' : 'OutOfStock',
      url: canonicalUrl,
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
