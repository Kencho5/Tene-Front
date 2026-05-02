import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '@core/services/products/cart.service';
import { FreeShippingBarService } from '@core/services/free-shipping-bar.service';

@Component({
  selector: 'app-free-shipping-bar',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './free-shipping-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreeShippingBarComponent {
  readonly cartService = inject(CartService);
  readonly bar = inject(FreeShippingBarService);
}
