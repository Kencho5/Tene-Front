import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { email, Field, form, required } from '@angular/forms/signals';
import { CheckoutFields } from '@core/interfaces/products.interface';
import { CartService } from '@core/services/products/cart.service';
import { ToastService } from '@core/services/toast.service';
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
    Field,
  ],
  templateUrl: './checkout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent {
  readonly cartService = inject(CartService);
  readonly toastService = inject(ToastService);

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => [
    { label: 'ჩემი კალათა', route: '/cart' },
    { label: 'შეკვეთის გაფორმება', route: '/checkout' },
  ]);

  readonly submitted = signal(false);

  readonly sectionStates = signal({
    contactDetails: true,
    deliveryDetails: true,
    paymentMethod: true,
  });

  readonly checkoutModel = signal<CheckoutFields>({
    customer_type: 'individual',
    name: '',
    surname: '',
    email: '',
    id_number: null,
    phone_number: null,
    address: '',
    delivery_type: 'delivery',
    delivery_time: 'same_day',
  });

  readonly checkoutForm = form(this.checkoutModel, (fieldPath) => {
    required(fieldPath.customer_type, { message: 'პირის არჩევა აუცილებელია' });
    required(fieldPath.name, { message: 'სახელი აუცილებელია' });
    required(fieldPath.surname, { message: 'გვარი აუცილებელია' });
    required(fieldPath.email, { message: 'ელ. ფოსტა აუცილებელია' });
    email(fieldPath.email, { message: 'შეიყვანეთ სწორი ელ. ფოსტა' });
    required(fieldPath.id_number, { message: 'პირადი ნომერი აუცილებელია' });
    required(fieldPath.phone_number, {
      message: 'ტელეფონის ნომერი აუცილებელია',
    });
    required(fieldPath.address, { message: 'მისამართი აუცილებელია' });
  });

  handleCheckout(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);
    console.log(this.checkoutForm().value());

    if (this.checkoutForm().invalid()) {
      const errors = this.checkoutForm().errorSummary();
      const errorMessage =
        errors.length > 0
          ? errors[0].message
          : 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი';

      this.toastService.add(
        'შეკვეთის გაფორმება ვერ მოხერხდა',
        errorMessage || 'გთხოვთ შეამოწმოთ ფორმა',
        5000,
        'error',
      );
      return;
    }
  }

  toggleSection(section: 'contactDetails' | 'deliveryDetails' | 'paymentMethod') {
    this.sectionStates.update((state) => ({
      ...state,
      [section]: !state[section],
    }));
  }
}
