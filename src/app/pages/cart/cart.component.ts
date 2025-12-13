import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '@core/services/products/cart.service';
import { CartItem } from '@core/interfaces/products.interface';
import { ImageComponent } from '@shared/components/ui/image/image.component';
import { SharedModule } from '@shared/shared.module';
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';
import { CartItemComponent } from '@shared/components/cart-item/cart-item.component';
import { PriceSummaryComponent } from '@shared/components/price-summary/price-summary.component';

@Component({
  selector: 'app-cart',
  imports: [
    SharedModule,
    ImageComponent,
    ConfirmationModalComponent,
    CartItemComponent,
    PriceSummaryComponent,
  ],
  templateUrl: './cart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent {
  readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  readonly isDeleteModalOpen = signal(false);
  private itemToDelete: CartItem | null = null;

  openDeleteModal(item: CartItem): void {
    this.itemToDelete = item;
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.itemToDelete = null;
  }

  confirmDelete(): void {
    if (this.itemToDelete) {
      this.cartService.removeItem(
        this.itemToDelete.product.id,
        this.itemToDelete.selectedColor,
        this.itemToDelete.selectedImageId
      );
      this.closeDeleteModal();
    }
  }

  handleCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  get deleteModalMessage(): string {
    return this.itemToDelete
      ? `ნამდვილად გსურთ ${this.itemToDelete.product.name} წაშლა თქვენი კალათიდან?`
      : 'ნამდვილად გსურთ ამ ნივთის წაშლა თქვენი კალათიდან?';
  }
}
