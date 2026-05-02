import { Component, ChangeDetectionStrategy, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { email, FormField, form, hidden, required } from '@angular/forms/signals';
import { catchError, EMPTY, of } from 'rxjs';
import { CheckoutFields, CheckoutRequest } from '@core/interfaces/products.interface';
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
import { georgianCities } from '@shared/components/address-form-modal/georgian-cities';
import { AuthService } from '@core/services/auth/auth-service.service';

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
  readonly authService = inject(AuthService);

  readonly isGuest = computed(() => !this.authService.isAuthenticated());
  readonly georgianCities = georgianCities;

  cityLabel(value: string): string {
    return georgianCities.find((c) => c.value === value)?.label ?? value;
  }

  private readonly highMountainCities = new Set([
    'mestia',
    'oni',
    'ambrolauri',
    'khulo',
    'shuakhevi',
  ]);

  readonly timeAllowsSameDay = (() => {
    const now = new Date();
    return now.getHours() < 17 || (now.getHours() === 17 && now.getMinutes() < 30);
  })();

  readonly selectedAddressCity = computed(() => {
    if (this.isGuest()) return this.checkoutForm.guest_city().value();
    const addr = this.checkoutForm.address().value();
    return this.addresses().find((a) => a.address === addr)?.city ?? '';
  });

  readonly sameDayAvailable = computed(() => {
    if (!this.timeAllowsSameDay) return false;
    const city = this.selectedAddressCity();
    return !city || city === 'tbilisi';
  });

  readonly deliveryNotice = computed(() => {
    const city = this.selectedAddressCity();
    if (!city || city === 'tbilisi') return '';
    if (this.highMountainCities.has(city)) {
      return 'მაღალმთიან რეგიონში (სვანეთი, რაჭა, ხევსურეთი, თუშეთი, ზემო აჭარა) მიწოდების ღირებულებაა 13.50 ₾.';
    }
    return 'თბილისის გარეთ მიწოდების ღირებულებაა 8.50 ₾. იმავე დღის მიწოდება ხელმისაწვდომია მხოლოდ თბილისში.';
  });

  readonly deliveryPrice = computed(() => {
    const deliveryTime = this.checkoutForm.delivery_time().value();
    const deliveryType = this.checkoutForm.delivery_type().value();
    const city = this.selectedAddressCity();

    if (deliveryType === 'pickup') return 0;
    if (this.highMountainCities.has(city)) return 13.5;
    if (city && city !== 'tbilisi') return 8.5;
    if (deliveryTime === 'same_day') return 12;
    return 5.5;
  });

  readonly checkoutLoading = signal(false);

  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => [
    { label: 'ჩემი კალათა', route: '/cart' },
    { label: 'შეკვეთის გაფორმება', route: '/checkout' },
  ]);

  readonly organizationTypes = organizationTypes;

  readonly submitted = signal(false);

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
      name: '',
      surname: '',
    },
    company: {
      organization_type: 'llc',
      organization_name: '',
      organization_code: '',
    },
    email: '',
    phone_number: '',
    address: '',
    guest_city: '',
    guest_address: '',
    guest_details: '',
    delivery_type: 'delivery',
    delivery_time: this.timeAllowsSameDay ? 'same_day' : 'next_day',
    comment: '',
  });

  readonly checkoutForm = form(this.checkoutModel, (fieldPath) => {
    required(fieldPath.customer_type, { message: 'პირის არჩევა აუცილებელია' });

    hidden(fieldPath.company, ({ valueOf }) => valueOf(fieldPath.customer_type) === 'individual');
    required(fieldPath.company.organization_name, {
      message: 'ორგანიზაციის სახელი აუცილებელია',
    });
    required(fieldPath.company.organization_code, {
      message: 'საიდენტიფიკაციო კოდი აუცილებელია',
    });

    hidden(fieldPath.individual, ({ valueOf }) => valueOf(fieldPath.customer_type) === 'company');
    required(fieldPath.individual.name, { message: 'სახელი აუცილებელია' });
    required(fieldPath.individual.surname, { message: 'გვარი აუცილებელია' });

    required(fieldPath.email, { message: 'ელ. ფოსტა აუცილებელია' });
    email(fieldPath.email, { message: 'შეიყვანეთ სწორი ელ. ფოსტა' });
    required(fieldPath.phone_number, {
      message: 'ტელეფონის ნომერი აუცილებელია',
    });
    hidden(
      fieldPath.address,
      ({ valueOf }) => valueOf(fieldPath.delivery_type) === 'pickup' || this.isGuest(),
    );
    required(fieldPath.address, { message: 'მისამართი აუცილებელია' });

    hidden(
      fieldPath.guest_city,
      ({ valueOf }) => valueOf(fieldPath.delivery_type) === 'pickup' || !this.isGuest(),
    );
    required(fieldPath.guest_city, { message: 'ქალაქი აუცილებელია' });

    hidden(
      fieldPath.guest_address,
      ({ valueOf }) => valueOf(fieldPath.delivery_type) === 'pickup' || !this.isGuest(),
    );
    required(fieldPath.guest_address, { message: 'მისამართი აუცილებელია' });
  });

  constructor() {
    if (this.cartService.items().length === 0) {
      this.router.navigate(['/cart']);
    }

    effect(() => {
      if (
        !this.sameDayAvailable() &&
        this.checkoutForm.delivery_time().value() === 'same_day'
      ) {
        this.checkoutForm.delivery_time().value.set('next_day');
      }
    });

    if (this.isGuest()) {
      this.loading.update((state) => ({ ...state, addresses: false }));
    } else {
      this.addressService
        .getAddresses()
        .pipe(
          takeUntilDestroyed(),
          catchError(() => {
            this.toastService.add('შეცდომა', 'მისამართების ჩატვირთვა ვერ მოხერხდა', 5000, 'error');
            return of([]);
          }),
        )
        .subscribe((addresses) => {
          this.addresses.set(addresses);
          this.loading.update((state) => ({ ...state, addresses: false }));
        });
    }
  }

  handleCheckout(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);

    if (this.checkoutForm().invalid()) {
      const errors = this.checkoutForm().errorSummary();
      const errorMessage =
        errors.length > 0 ? errors[0].message : 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი';

      this.toastService.add(
        'შეკვეთის გაფორმება ვერ მოხერხდა',
        errorMessage || 'გთხოვთ შეამოწმოთ დეტალები',
        5000,
        'error',
      );
      return;
    }

    if (this.cartService.items().length === 0) {
      this.toastService.add('კალათა ცარიელია', 'გთხოვთ დაამატოთ ნივთები კალათაში', 5000, 'error');
      return;
    }

    const model = this.checkoutModel();
    const isIndividual = model.customer_type === 'individual';
    const guest = this.isGuest();
    const selectedAddress = guest
      ? null
      : this.addresses().find((a) => a.address === model.address);

    const resolvedAddress = guest ? model.guest_address : model.address;
    const resolvedCity = guest ? model.guest_city : selectedAddress?.city ?? '';
    const resolvedDetails = guest ? model.guest_details : selectedAddress?.details ?? '';

    const request: CheckoutRequest = {
      customer_type: model.customer_type,
      ...(isIndividual
        ? { name: model.individual.name, surname: model.individual.surname }
        : {
            organization_type: model.company.organization_type,
            organization_name: model.company.organization_name,
            organization_code: model.company.organization_code,
          }),
      email: model.email,
      phone_number: model.phone_number,
      address: resolvedAddress,
      city: resolvedCity,
      details: resolvedDetails,
      delivery_type: model.delivery_type,
      delivery_time: model.delivery_time,
      ...(model.comment ? { comment: model.comment } : {}),
      items: this.cartService.items().map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        color: item.selectedColor,
        ...(item.cableConfig
          ? {
              cable_config: {
                watts: item.cableConfig.watts,
                length_cm: item.cableConfig.lengthCm,
              },
            }
          : {}),
      })),
    };

    this.checkoutLoading.set(true);

    this.orderService
      .checkout(request)
      .pipe(
        catchError((error) => {
          const message = error?.error?.message || 'შეკვეთის გაფორმება ვერ მოხერხდა';
          this.toastService.add('შეცდომა', message, 5000, 'error');
          this.checkoutLoading.set(false);
          return EMPTY;
        }),
      )
      .subscribe((response) => {
        if (guest && typeof localStorage !== 'undefined') {
          try {
            const stored = JSON.parse(localStorage.getItem('guest_orders') ?? '[]');
            const ids: string[] = Array.isArray(stored) ? stored : [];
            if (response.order_id && !ids.includes(response.order_id)) {
              ids.unshift(response.order_id);
              localStorage.setItem('guest_orders', JSON.stringify(ids.slice(0, 50)));
            }
          } catch {
            localStorage.setItem('guest_orders', JSON.stringify([response.order_id]));
          }
        }
        window.location.href = response.checkout_url;
      });
  }

  toggleSection(section: 'contactDetails' | 'deliveryDetails' | 'paymentMethod') {
    this.sectionStates.update((state) => ({
      ...state,
      [section]: !state[section],
    }));
  }

  onAddressSaved(address: AddressData) {
    const existing = this.addresses().find((a) => a.id === address.id);
    if (existing) {
      this.addresses.update((addrs) => addrs.map((a) => (a.id === address.id ? address : a)));
    } else {
      this.addresses.set([...this.addresses(), address]);
    }
  }
}
