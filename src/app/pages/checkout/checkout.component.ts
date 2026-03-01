import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { email, FormField, form, hidden, required } from '@angular/forms/signals';
import { catchError, EMPTY, of } from 'rxjs';
import {
  CheckoutFields,
  CheckoutRequest,
} from '@core/interfaces/products.interface';
import { organizationTypes } from '@utils/organizationTypes';
import { CartService } from '@core/services/products/cart.service';
import { OrderService } from '@core/services/order.service';
import { Router } from '@angular/router';
import { ToastService } from '@core/services/toast.service';
import { AddressService } from '@core/services/address.service';
import { CartItemComponent } from '@shared/components/cart-item/cart-item.component';
import { PriceSummaryComponent } from '@shared/components/price-summary/price-summary.component';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '@shared/components/ui/breadcrumb/breadcrumb.component';
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { ComboboxComponent } from '@shared/components/ui/combobox/combobox.component';
import { SharedModule } from '@shared/shared.module';
import { AddressData } from '@core/interfaces/address.interface';
import { AddressFormModalComponent } from '@shared/components/address-form-modal/address-form-modal.component';

@Component({
  selector: 'app-checkout',
  imports: [
    SharedModule,
    BreadcrumbComponent,
    PriceSummaryComponent,
    CartItemComponent,
    ConfirmationModalComponent,
    InputComponent,
    ComboboxComponent,
    AddressFormModalComponent,
    FormField,
  ],
  templateUrl: './checkout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent {
  readonly cartService = inject(CartService);
  readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  readonly toastService = inject(ToastService);
  readonly addressService = inject(AddressService);

  readonly checkoutLoading = signal(false);

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => [
    { label: 'ჩემი კალათა', route: '/cart' },
    { label: 'შეკვეთის გაფორმება', route: '/checkout' },
  ]);

  readonly organizationTypes = organizationTypes;

  readonly submitted = signal(false);
  readonly selectedCity = signal<string>('');

  readonly loading = signal({
    addresses: true,
  });

  readonly addresses = signal<AddressData[]>([]);

  readonly sectionStates = signal({
    contactDetails: true,
    deliveryDetails: true,
    paymentMethod: true,
  });

  readonly checkoutModel = signal<CheckoutFields>({
    customer_type: 'individual',
    individual: {
      name: 'giorgi',
      surname: 'kenchadze',
    },
    company: {
      organization_type: 'llc',
      organization_name: '',
      organization_code: '',
    },
    email: 'giokenchadze@gmail.com',
    phone_number: 557325235,
    address: '',
    delivery_type: 'delivery',
    delivery_time: 'same_day',
  });

  // readonly checkoutModel = signal<CheckoutFields>({
  //   customer_type: 'individual',
  //   individual: {
  //     name: '',
  //     surname: '',
  //   },
  //   company: {
  //     organization_type: 'llc',
  //     organization_name: '',
  //     organization_code: '',
  //   },
  //   email: '',
  //   phone_number: null,
  //   address: '',
  //   delivery_type: 'delivery',
  //   delivery_time: 'same_day',
  // });

  readonly checkoutForm = form(this.checkoutModel, (fieldPath) => {
    required(fieldPath.customer_type, { message: 'პირის არჩევა აუცილებელია' });

    hidden(
      fieldPath.company,
      ({ valueOf }) => valueOf(fieldPath.customer_type) === 'individual',
    );
    required(fieldPath.company.organization_name, {
      message: 'ორგანიზაციის სახელი აუცილებელია',
    });
    required(fieldPath.company.organization_code, {
      message: 'საიდენტიფიკაციო კოდი აუცილებელია',
    });

    hidden(
      fieldPath.individual,
      ({ valueOf }) => valueOf(fieldPath.customer_type) === 'company',
    );
    required(fieldPath.individual.name, { message: 'სახელი აუცილებელია' });
    required(fieldPath.individual.surname, { message: 'გვარი აუცილებელია' });

    required(fieldPath.email, { message: 'ელ. ფოსტა აუცილებელია' });
    email(fieldPath.email, { message: 'შეიყვანეთ სწორი ელ. ფოსტა' });
    required(fieldPath.phone_number, {
      message: 'ტელეფონის ნომერი აუცილებელია',
    });
    required(fieldPath.address, { message: 'მისამართი აუცილებელია' });
  });

  constructor() {
    if (this.cartService.items().length === 0) {
      this.router.navigate(['/cart']);
    }

    this.addressService
      .getAddresses()
      .pipe(
        takeUntilDestroyed(),
        catchError(() => {
          this.toastService.add(
            'შეცდომა',
            'მისამართების ჩატვირთვა ვერ მოხერხდა',
            5000,
            'error',
          );
          return of([]);
        }),
      )
      .subscribe((addresses) => {
        this.addresses.set(addresses);
        this.loading.update((state) => ({ ...state, addresses: false }));
      });
  }

  handleCheckout(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);

    if (this.checkoutForm().invalid()) {
      const errors = this.checkoutForm().errorSummary();
      const errorMessage =
        errors.length > 0
          ? errors[0].message
          : 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი';

      this.toastService.add(
        'შეკვეთის გაფორმება ვერ მოხერხდა',
        errorMessage || 'გთხოვთ შეამოწმოთ დეტალები',
        5000,
        'error',
      );
      return;
    }

    if (this.cartService.items().length === 0) {
      this.toastService.add(
        'კალათა ცარიელია',
        'გთხოვთ დაამატოთ ნივთები კალათაში',
        5000,
        'error',
      );
      return;
    }

    const model = this.checkoutModel();
    const isIndividual = model.customer_type === 'individual';

    const request: CheckoutRequest = {
      customer_type: model.customer_type,
      individual: isIndividual
        ? { name: model.individual.name, surname: model.individual.surname }
        : null,
      company: !isIndividual
        ? {
            organization_type: model.company.organization_type,
            organization_name: model.company.organization_name,
            organization_code: model.company.organization_code,
          }
        : null,
      email: model.email,
      phone_number: Number(model.phone_number),
      address: model.address,
      delivery_type: model.delivery_type,
      delivery_time: model.delivery_time,
      items: this.cartService.items().map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        color: item.selectedColor,
      })),
    };

    this.checkoutLoading.set(true);

    this.orderService
      .checkout(request)
      .pipe(
        catchError((error) => {
          const message =
            error?.error?.message || 'შეკვეთის გაფორმება ვერ მოხერხდა';
          this.toastService.add('შეცდომა', message, 5000, 'error');
          this.checkoutLoading.set(false);
          return EMPTY;
        }),
      )
      .subscribe((response) => {
        window.location.href = response.checkout_url;
      });
  }

  toggleSection(
    section: 'contactDetails' | 'deliveryDetails' | 'paymentMethod',
  ) {
    this.sectionStates.update((state) => ({
      ...state,
      [section]: !state[section],
    }));
  }

  onAddressSaved(address: AddressData) {
    const existing = this.addresses().find((a) => a.id === address.id);
    if (existing) {
      this.addresses.update((addrs) =>
        addrs.map((a) => (a.id === address.id ? address : a)),
      );
    } else {
      this.addresses.set([...this.addresses(), address]);
    }
  }
}
