import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { email, FormField, form, hidden, required, submit } from '@angular/forms/signals';
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
import { ConfirmationModalComponent } from '@shared/components/ui/confirmation-modal/confirmation-modal.component';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { ComboboxComponent } from '@shared/components/ui/combobox/combobox.component';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { AddressData } from '@core/interfaces/address.interface';
import { AddressFormModalComponent } from '@shared/components/address-form-modal/address-form-modal.component';
import { georgianCities } from '@shared/components/address-form-modal/georgian-cities';
import { AuthService } from '@core/services/auth/auth-service.service';
import { DeliveryPricingService } from './delivery-pricing.service';
import {
  CheckoutAnalyticsEvent,
  CheckoutAnalyticsService,
} from '@core/services/checkout-analytics.service';

type StepKey = 'contact' | 'delivery' | 'review' | 'payment';

const CHECKOUT_STORAGE_KEY = 'checkout_form';
const CHECKOUT_SESSION_KEY = 'checkout_session_id';

interface StepInfo {
  key: StepKey;
  label: string;
  shortLabel: string;
}

@Component({
  selector: 'app-checkout',
  imports: [
    NgClass,
    PriceSummaryComponent,
    CartItemComponent,
    ConfirmationModalComponent,
    InputComponent,
    ComboboxComponent,
    DropdownComponent,
    AddressFormModalComponent,
    FormField,
  ],
  templateUrl: './checkout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(focusout)': 'onFieldBlur()',
  },
})
export class CheckoutComponent {
  readonly cartService = inject(CartService);
  readonly orderService = inject(OrderService);
  private readonly router = inject(Router);
  readonly toastService = inject(ToastService);
  readonly addressService = inject(AddressService);
  readonly authService = inject(AuthService);
  private readonly deliveryPricing = inject(DeliveryPricingService);
  private readonly analytics = inject(CheckoutAnalyticsService);

  readonly isGuest = computed(() => !this.authService.isAuthenticated());
  readonly georgianCities = georgianCities;

  cityLabel(value: string): string {
    return georgianCities.find((c) => c.value === value)?.label ?? value;
  }

  readonly timeAllowsSameDay = this.deliveryPricing.timeAllowsSameDay;

  readonly selectedAddressDisplay = computed(() => {
    const id = this.checkoutForm.address().value();
    return this.addresses().find((a) => String(a.id) === id)?.address ?? '';
  });

  readonly selectedAddressCity = computed(() => {
    if (this.isGuest()) return this.checkoutForm.guest_city().value();
    const id = this.checkoutForm.address().value();
    return this.addresses().find((a) => String(a.id) === id)?.city ?? '';
  });

  private readonly pricing = this.deliveryPricing.create({
    city: this.selectedAddressCity,
    deliveryTime: computed(() => this.checkoutForm.delivery_time().value()),
    deliveryType: computed(() => this.checkoutForm.delivery_type().value()),
  });

  readonly sameDayAvailable = this.pricing.sameDayAvailable;
  readonly sameDayUnavailableReason = this.pricing.sameDayUnavailableReason;
  readonly deliveryNotice = this.pricing.deliveryNotice;
  readonly deliveryPrice = this.pricing.deliveryPrice;
  readonly sameDayPrice = this.pricing.sameDayPrice;
  readonly nextDayPrice = this.pricing.nextDayPrice;
  readonly deliveryTimeOptions = this.pricing.deliveryTimeOptions;
  readonly nextDayLabelPrefix = this.pricing.nextDayLabelPrefix;

  readonly checkoutLoading = signal(false);

  readonly organizationTypes = organizationTypes;

  readonly submitted = signal(false);
  private readonly scrollPending = signal(false);
  private readonly errorElements = viewChildren<ElementRef<HTMLElement>>('errorAnchor');

  readonly loading = signal({
    addresses: true,
  });

  readonly addresses = signal<AddressData[]>([]);

  readonly steps: StepInfo[] = [
    { key: 'contact', label: 'საკონტაქტო დეტალები', shortLabel: 'საკონტაქტო' },
    { key: 'delivery', label: 'მიწოდება', shortLabel: 'მიწოდება' },
    { key: 'review', label: 'მიმოხილვა', shortLabel: 'მიმოხილვა' },
    { key: 'payment', label: 'გადახდა', shortLabel: 'გადახდა' },
  ];

  readonly currentStepIndex = signal(0);
  readonly currentStep = computed(() => this.steps[this.currentStepIndex()].key);
  readonly isFirstStep = computed(() => this.currentStepIndex() === 0);
  readonly isLastStep = computed(() => this.currentStepIndex() === this.steps.length - 1);
  readonly progressPercent = computed(
    () => ((this.currentStepIndex() + 1) / this.steps.length) * 100,
  );

  private readonly initialUserInfo = (() => {
    const user = this.authService.user();
    const fullName = user?.name?.trim() ?? '';
    const [firstName = '', ...rest] = fullName.split(/\s+/);
    return {
      name: firstName,
      surname: rest.join(' '),
      email: user?.email ?? '',
    };
  })();

  private readonly defaultModel: CheckoutFields = {
    customer_type: 'individual',
    individual: {
      name: this.initialUserInfo.name,
      surname: this.initialUserInfo.surname,
    },
    company: {
      organization_type: 'llc',
      organization_name: '',
      organization_code: '',
    },
    email: this.initialUserInfo.email,
    phone_number: '',
    address: '',
    guest_city: '',
    guest_address: '',
    guest_details: '',
    delivery_type: 'delivery',
    delivery_time: '',
    comment: '',
  };

  readonly checkoutModel = signal<CheckoutFields>(this.loadPersistedModel());

  private isNewSession = false;
  private readonly sessionId = this.resolveSessionId();
  private fieldSnapshot = new Map<string, string>();

  private resolveSessionId(): string {
    const generate = () =>
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    if (typeof localStorage === 'undefined') return generate();

    const existing = localStorage.getItem(CHECKOUT_SESSION_KEY);
    if (existing) return existing;

    const id = generate();
    localStorage.setItem(CHECKOUT_SESSION_KEY, id);
    this.isNewSession = true;
    return id;
  }

  private loadPersistedModel(): CheckoutFields {
    if (typeof localStorage === 'undefined') return this.defaultModel;
    try {
      const raw = localStorage.getItem(CHECKOUT_STORAGE_KEY);
      if (!raw) return this.defaultModel;
      const saved = JSON.parse(raw) as Partial<CheckoutFields>;
      return {
        ...this.defaultModel,
        ...saved,
        individual: { ...this.defaultModel.individual, ...saved.individual },
        company: { ...this.defaultModel.company, ...saved.company },
        address: '',
      };
    } catch {
      return this.defaultModel;
    }
  }

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

    hidden(fieldPath.delivery_time, ({ valueOf }) => valueOf(fieldPath.delivery_type) === 'pickup');
    required(fieldPath.delivery_time, { message: 'მიწოდების დრო აუცილებელია' });
  });

  constructor() {
    afterNextRender(() => {
      if (this.cartService.items().length === 0) {
        this.router.navigate(['/cart']);
      }
    });

    if (this.isNewSession) {
      this.emit('session_start');
    }
    this.onFieldBlur();

    effect(() => {
      this.currentStepIndex();
      untracked(() => {
        this.onFieldBlur();
        this.emit('step_view');
      });
    });

    effect(() => {
      if (!this.sameDayAvailable() && this.checkoutForm.delivery_time().value() === 'same_day') {
        this.checkoutForm.delivery_time().value.set('');
      }
    });

    effect(() => {
      const model = this.checkoutModel();
      if (typeof localStorage === 'undefined') return;
      try {
        localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(model));
      } catch {
        // ignore
      }
    });

    effect(() => {
      if (this.currentStep() === 'payment' && !this.checkoutLoading()) {
        this.handleCheckout();
      }
    });

    effect(() => {
      if (!this.scrollPending()) return;
      const els = this.errorElements();
      if (els.length === 0) return;
      const el = els[0].nativeElement;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusable = el.matches('input, textarea, button')
        ? el
        : el.querySelector<HTMLElement>('input, textarea, button');
      focusable?.focus({ preventScroll: true });
      this.scrollPending.set(false);
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
          if (addresses.length > 0 && !this.checkoutForm.address().value()) {
            this.checkoutForm.address().value.set(String(addresses[0].id));
          }
        });
    }
  }

  handleCheckout(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);

    if (this.checkoutForm().invalid()) {
      this.goToFirstInvalidStep();
      this.scrollPending.set(true);
      return;
    }

    if (this.cartService.items().length === 0) {
      this.toastService.add('კალათა ცარიელია', 'გთხოვთ დაამატოთ ნივთები კალათაში', 5000, 'error');
      return;
    }

    submit(this.checkoutForm, async () => {
      this.dispatchCheckout();
      return [];
    });
  }

  goNext(): void {
    if (this.isLastStep()) {
      this.handleCheckout();
      return;
    }
    this.submitted.set(true);
    if (!this.isCurrentStepValid()) {
      this.scrollPending.set(true);
      return;
    }
    this.submitted.set(false);
    this.currentStepIndex.update((i) => Math.min(i + 1, this.steps.length - 1));
    this.scrollToTop();
  }

  goBack(): void {
    if (this.isFirstStep()) return;
    if (this.currentStep() === 'payment') return;
    this.currentStepIndex.update((i) => Math.max(i - 1, 0));
    this.scrollToTop();
  }

  goToStep(index: number): void {
    if (index === this.currentStepIndex()) return;
    if (index < this.currentStepIndex()) {
      this.currentStepIndex.set(index);
      this.scrollToTop();
      return;
    }
    for (let i = this.currentStepIndex(); i < index; i++) {
      this.submitted.set(true);
      if (!this.isStepValid(this.steps[i].key)) {
        this.scrollPending.set(true);
        return;
      }
    }
    this.submitted.set(false);
    this.currentStepIndex.set(index);
    this.scrollToTop();
  }

  private scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private isCurrentStepValid(): boolean {
    return this.isStepValid(this.currentStep());
  }

  private isStepValid(step: StepKey): boolean {
    switch (step) {
      case 'contact':
        return !this.hasContactErrors();
      case 'delivery':
        return !this.hasDeliveryErrors();
      case 'review':
      case 'payment':
        return !this.checkoutForm().invalid();
    }
  }

  private goToFirstInvalidStep(): void {
    if (this.hasContactErrors()) {
      this.currentStepIndex.set(0);
      return;
    }
    if (this.hasDeliveryErrors()) {
      this.currentStepIndex.set(1);
      return;
    }
  }

  private dispatchCheckout(): void {
    const model = this.checkoutModel();
    const isIndividual = model.customer_type === 'individual';
    const guest = this.isGuest();
    const selectedAddress = guest
      ? null
      : this.addresses().find((a) => String(a.id) === model.address);

    const resolvedAddress = guest ? model.guest_address : (selectedAddress?.address ?? '');
    const resolvedCity = guest ? model.guest_city : (selectedAddress?.city ?? '');
    const resolvedDetails = guest ? model.guest_details : (selectedAddress?.details ?? '');

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
        this.emit('purchase', { order_id: response.order_id });
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(CHECKOUT_STORAGE_KEY);
          localStorage.removeItem(CHECKOUT_SESSION_KEY);
        }
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

  private hasContactErrors(): boolean {
    const f = this.checkoutForm;
    const isIndividual = f.customer_type().value() === 'individual';
    const isCompany = f.customer_type().value() === 'company';
    return (
      f.email().invalid() ||
      f.phone_number().invalid() ||
      (isIndividual && (f.individual.name().invalid() || f.individual.surname().invalid())) ||
      (isCompany &&
        (f.company.organization_name().invalid() || f.company.organization_code().invalid()))
    );
  }

  private hasDeliveryErrors(): boolean {
    const f = this.checkoutForm;
    if (f.delivery_type().value() === 'pickup') return false;
    if (f.delivery_time().invalid()) return true;
    if (this.isGuest()) {
      return f.guest_city().invalid() || f.guest_address().invalid();
    }
    return f.address().invalid();
  }

  onAddressSaved(address: AddressData) {
    const existing = this.addresses().find((a) => a.id === address.id);
    if (existing) {
      this.addresses.update((addrs) => addrs.map((a) => (a.id === address.id ? address : a)));
    } else {
      this.addresses.set([...this.addresses(), address]);
    }
    this.checkoutForm.address().value.set(String(address.id));
  }

  readonly isAddressDeleteModalOpen = signal(false);
  readonly deletingAddress = signal<AddressData | null>(null);

  openDeleteModal(address: AddressData) {
    this.deletingAddress.set(address);
    this.isAddressDeleteModalOpen.set(true);
  }

  closeAddressDeleteModal() {
    this.isAddressDeleteModalOpen.set(false);
    this.deletingAddress.set(null);
  }

  confirmAddressDelete() {
    const address = this.deletingAddress();
    if (!address?.id) return;

    this.addressService.deleteAddress(address.id).subscribe({
      next: () => {
        this.toastService.add('წარმატებული', 'მისამართი წარმატებით წაიშალა', 3000, 'success');
        this.addresses.update((addrs) => addrs.filter((a) => a.id !== address.id));
        if (this.checkoutForm.address().value() === String(address.id)) {
          const next = this.addresses()[0];
          this.checkoutForm.address().value.set(next ? String(next.id) : '');
        }
        this.closeAddressDeleteModal();
      },
      error: () => {
        this.toastService.add('შეცდომა', 'მისამართის წაშლა ვერ მოხერხდა', 5000, 'error');
        this.closeAddressDeleteModal();
      },
    });
  }

  onFieldBlur(): void {
    const next = this.flattenModel(this.checkoutModel());
    for (const [field, value] of next) {
      if (this.fieldSnapshot.get(field) !== value) {
        this.emit('field_change', { field, value });
      }
    }
    this.fieldSnapshot = next;
  }

  private flattenModel(model: CheckoutFields): Map<string, string> {
    const entries = new Map<string, string>([
      ['customer_type', model.customer_type],
      ['individual.name', model.individual.name],
      ['individual.surname', model.individual.surname],
      ['company.organization_type', model.company.organization_type],
      ['company.organization_name', model.company.organization_name],
      ['company.organization_code', model.company.organization_code],
      ['email', model.email],
      ['phone_number', model.phone_number],
      ['address', model.address],
      ['guest_city', model.guest_city],
      ['guest_address', model.guest_address],
      ['guest_details', model.guest_details],
      ['delivery_type', model.delivery_type],
      ['delivery_time', model.delivery_time],
      ['comment', model.comment],
    ]);
    return entries;
  }

  private emit(
    type: CheckoutAnalyticsEvent['type'],
    extra: Partial<Pick<CheckoutAnalyticsEvent, 'field' | 'value' | 'order_id'>> = {},
  ): void {
    this.analytics.send({
      session_id: this.sessionId,
      type,
      step: this.currentStep(),
      step_index: this.currentStepIndex(),
      is_guest: this.isGuest(),
      timestamp: Date.now(),
      ...extra,
    });
  }
}
