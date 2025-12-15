import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
} from '@angular/core';
import { CartService } from '@core/services/products/cart.service';
import { CartItemComponent } from '@shared/components/cart-item/cart-item.component';
import { PriceSummaryComponent } from '@shared/components/price-summary/price-summary.component';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '@shared/components/ui/breadcrumb/breadcrumb.component';
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-checkout',
  imports: [
    SharedModule,
    BreadcrumbComponent,
    PriceSummaryComponent,
    CartItemComponent,
    ConfirmationModalComponent,
    InputComponent,
  ],
  templateUrl: './checkout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent {
  readonly cartService = inject(CartService);

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => [
    { label: 'ჩემი კალათა', route: '/cart' },
    { label: 'შეკვეთის გაფორმება', route: '/checkout' },
  ]);

  handleCheckout(): void {}
}
