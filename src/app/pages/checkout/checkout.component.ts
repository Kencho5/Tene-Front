import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CartComponent } from '@pages/cart/cart.component';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-checkout',
  imports: [SharedModule, CartComponent],
  templateUrl: './checkout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent {}
