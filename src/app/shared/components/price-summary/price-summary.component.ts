import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
} from '@angular/core';
import { CartService } from '@core/services/products/cart.service';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-price-summary',
  imports: [SharedModule],
  templateUrl: './price-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceSummaryComponent {
  readonly title = input<string>('გადახდა');
  readonly deliveryPrice = input<number>(5);
  readonly showCheckoutButton = input<boolean>(true);
  readonly checkoutButtonText = input<string>('შეკვეთის გაფორმება');
  readonly checkoutLoading = input<boolean>(false);

  readonly checkout = output<void>();

  readonly cartService = inject(CartService);

  onCheckout(): void {
    this.checkout.emit();
  }
}
