import {
  Component,
  ChangeDetectionStrategy,
  input,
  inject,
  computed,
} from '@angular/core';
import { CartItem } from '@core/interfaces/products.interface';
import { CartService } from '@core/services/products/cart.service';
import { ImageComponent } from '@shared/components/ui/image/image.component';
import { SharedModule } from '@shared/shared.module';
import { generateProductSlug } from '@utils/slug';
import { getProductImageUrl } from '@utils/product-image-url';

@Component({
  selector: 'app-cart-item',
  imports: [SharedModule, ImageComponent],
  templateUrl: './cart-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartItemComponent {
  readonly item = input.required<CartItem>();
  readonly showQuantityControls = input<boolean>(true);
  readonly clickable = input<boolean>(true);

  readonly cartService = inject(CartService);

  readonly productSlug = computed(() => {
    return generateProductSlug(this.item().product.name);
  });

  getImageSrc(imageId: string, productId: number): string {
    return getProductImageUrl(productId, imageId);
  }

  onDelete(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.cartService.openDeleteModal(this.item());
  }

  onUpdateQuantity(event: MouseEvent, delta: number): void {
    event.preventDefault();
    event.stopPropagation();
    const item = this.item();
    this.cartService.updateQuantity(
      item.product.id,
      item.selectedColor,
      item.selectedImageId,
      item.quantity + delta
    );
  }
}
