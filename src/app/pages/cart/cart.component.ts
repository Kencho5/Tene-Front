import { Component, inject } from '@angular/core';
import { CartService } from '@core/services/products/cart.service';
import { ImageComponent } from '@shared/components/ui/image/image.component';
import { SharedModule } from '@shared/shared.module';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-cart',
  imports: [SharedModule, ImageComponent],
  templateUrl: './cart.component.html',
})
export class CartComponent {
  readonly cartService = inject(CartService);

  readonly imageBaseUrl = environment.product_image_url;

  deliveryPrice: number = 5;

  getImageSrc(imageId: string, productId: number): string {
    return `${this.imageBaseUrl}/products/${productId}/${imageId}.jpg`;
  }

  calculateFinalPrice(price: number, discount: number): number {
    if (discount === 0) {
      return price;
    }

    const discountAmount = (price * discount) / 100;
    const priceAfterDiscount = price - discountAmount;

    return Math.round((Math.floor(priceAfterDiscount) + 0.99) * 100) / 100;
  }

  calculateTotalPrice(price: number, quantity: number): number {
    return Math.round(price * quantity * 100) / 100;
  }
}
