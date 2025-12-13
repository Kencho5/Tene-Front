import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CartService } from '@core/services/products/cart.service';
import { ImageComponent } from '@shared/components/ui/image/image.component';
import { SharedModule } from '@shared/shared.module';
import { environment } from '@environments/environment';
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';

interface ItemToDelete {
  productId: number;
  color: string;
  imageId: string;
  productName: string;
}

@Component({
  selector: 'app-cart',
  imports: [SharedModule, ImageComponent, ConfirmationModalComponent],
  templateUrl: './cart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent {
  readonly cartService = inject(CartService);

  readonly imageBaseUrl = environment.product_image_url;

  deliveryPrice: number = 5;

  readonly isDeleteModalOpen = signal(false);
  itemToDelete: ItemToDelete | null = null;

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

  openDeleteModal(productId: number, color: string, imageId: string, productName: string): void {
    this.itemToDelete = { productId, color, imageId, productName };
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.itemToDelete = null;
  }

  confirmDelete(): void {
    if (this.itemToDelete) {
      this.cartService.removeItem(
        this.itemToDelete.productId,
        this.itemToDelete.color,
        this.itemToDelete.imageId
      );
      this.closeDeleteModal();
    }
  }
}
