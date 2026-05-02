import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '@core/services/products/cart.service';
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

  handleCheckout(): void {
    this.router.navigate(['/checkout']);
  }
}
