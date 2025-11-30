import { Component, inject } from '@angular/core';
import { CartService } from '@core/services/products/cart.service';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-cart',
  imports: [SharedModule],
  templateUrl: './cart.component.html',
})
export class CartComponent {
  private readonly cartService = inject(CartService);
}
