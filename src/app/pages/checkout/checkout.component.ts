import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { email, Field, form, hidden, required } from '@angular/forms/signals';
import { catchError, of } from 'rxjs';
import { CheckoutFields } from '@core/interfaces/products.interface';
import { organizationTypes } from '@utils/organizationTypes';
import { storeCities } from '@utils/store-cities';
import { CartService } from '@core/services/products/cart.service';
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
import { ModalComponent } from '@shared/components/ui/modal/modal.component';
import { SharedModule } from '@shared/shared.module';
import { AddressData } from '@core/interfaces/address.interface';

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
    ModalComponent,
    Field,
  ],
  templateUrl: './checkout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent {
  readonly cartService = inject(CartService);
  readonly toastService = inject(ToastService);
  readonly addressService = inject(AddressService);

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => [
    { label: 'ჩემი კალათა', route: '/cart' },
    { label: 'შეკვეთის გაფორმება', route: '/checkout' },
  ]);

  readonly organizationTypes = organizationTypes;
  readonly storeCities = storeCities;

  readonly submitted = signal(false);
  readonly isAddressModalOpen = signal(false);
  readonly selectedCity = signal<string>('');

  readonly loading = signal({
    addresses: true,
  });

  readonly addressModel = signal<AddressData>({
    city: '',
    address: '',
    details: '',
  });

  readonly addresses = signal<AddressData[]>([]);

  readonly addressForm = form(this.addressModel, (fieldPath) => {
    required(fieldPath.city, { message: 'ქალაქი აუცილებელია' });
    required(fieldPath.address, { message: 'მისამართი აუცილებელია' });
  });

  readonly sectionStates = signal({
    contactDetails: true,
    deliveryDetails: true,
    paymentMethod: true,
  });

  readonly checkoutModel = signal<CheckoutFields>({
    customer_type: 'individual',
    individual: {
      name: '',
      surname: '',
    },
    company: {
      organization_type: 'llc',
      organization_name: '',
      organization_code: '',
    },
    email: '',
    phone_number: null,
    address: '',
    delivery_type: 'delivery',
    delivery_time: 'same_day',
  });

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
  }

  toggleSection(
    section: 'contactDetails' | 'deliveryDetails' | 'paymentMethod',
  ) {
    this.sectionStates.update((state) => ({
      ...state,
      [section]: !state[section],
    }));
  }

  handleAddressSubmit() {
    if (this.addressForm().invalid()) {
      const errors = this.addressForm().errorSummary();
      const errorMessage =
        errors.length > 0 && errors[0].message
          ? errors[0].message
          : 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი';

      this.toastService.add(
        'მისამართის დამატება ვერ მოხერხდა',
        errorMessage,
        5000,
        'error',
      );
      return;
    }

    const addressData = this.addressForm().value();
    this.addressService.addAddress(addressData).subscribe({
      next: (newAddress) => {
        this.addresses.set([...this.addresses(), newAddress]);
        this.toastService.add(
          'წარმატებული',
          'მისამართი წარმატებით დაემატა',
          3000,
          'success',
        );
        this.isAddressModalOpen.set(false);
        this.addressForm().reset();
      },
      error: () => {
        this.toastService.add(
          'შეცდომა',
          'მისამართის დამატება ვერ მოხერხდა',
          5000,
          'error',
        );
      },
    });
  }
}
