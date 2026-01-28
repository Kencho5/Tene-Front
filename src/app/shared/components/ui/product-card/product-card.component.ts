import { Component, computed, inject, input } from '@angular/core';
import { ProductResponse } from '@core/interfaces/products.interface';
import { SharedModule } from '@shared/shared.module';
import { ImageComponent } from '../image/image.component';
import { calculateDiscount } from '@utils/discountedPrice';
import { CartService } from '@core/services/products/cart.service';
import { generateProductSlug } from '@utils/slug';
import { getProductImageUrl } from '@utils/product-image-url';

@Component({
  selector: 'app-product-card',
  imports: [SharedModule, ImageComponent],
  templateUrl: './product-card.component.html',
})
export class ProductCardComponent {
  readonly cartService = inject(CartService);

  readonly product = input.required<ProductResponse>();

  readonly productSlug = computed(() => {
    return generateProductSlug(this.product().data.name);
  });

  readonly discountedPrice = computed(() => {
    return calculateDiscount(this.product().data);
  });

  readonly productImage = computed(() => {
    const primaryImage = this.product().images.find(
      (image) => image.is_primary,
    );
    if (!primaryImage) return '';

    return getProductImageUrl(
      this.product().data.id,
      primaryImage.image_uuid,
      primaryImage.extension,
    );
  });

  addToCart(): void {
    const productData = this.product().data;
    const primaryImage = this.product().images.find(
      (image) => image.is_primary,
    );

    if (!productData || !primaryImage) return;

    this.cartService.addItem({
      product: productData,
      quantity: 1,
      selectedColor: primaryImage.color,
      selectedImageId: primaryImage.image_uuid,
      selectedImageExtension: primaryImage.extension,
    });
  }
}
