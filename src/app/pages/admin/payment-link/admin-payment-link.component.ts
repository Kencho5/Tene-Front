import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import {
  applyEach,
  email,
  form,
  FormField,
  hidden,
  min,
  minError,
  required,
  requiredError,
  submit,
  validate,
} from '@angular/forms/signals';
import { catchError, of } from 'rxjs';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import { ProductResponse } from '@core/interfaces/products.interface';
import {
  PaymentLinkCustomer,
  PaymentLinkFields,
  PaymentLinkItem,
  PaymentLinkRequest,
} from '@core/interfaces/admin/payment-link.interface';
import { AdminService } from '@core/services/admin/admin.service';
import { ToastService } from '@core/services/toast.service';
import { getProductImageUrl } from '@utils/product-image-url';
import { organizationTypes } from '@utils/organizationTypes';
import { georgianCities } from '@shared/components/address-form-modal/georgian-cities';
import { TBILISI_REGIONS } from '@pages/checkout/checkout.config';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { ComboboxComponent } from '@shared/components/ui/combobox/combobox.component';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { SharedModule } from '@shared/shared.module';

@Component({
  selector: 'app-admin-payment-link',
  imports: [SharedModule, DropdownComponent, ComboboxComponent, InputComponent, FormField],
  templateUrl: './admin-payment-link.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPaymentLinkComponent {
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);

  readonly organizationTypes = organizationTypes;
  readonly georgianCities = georgianCities;
  readonly tbilisiRegions = TBILISI_REGIONS;

  readonly customerTypeOptions: ComboboxItems[] = [
    { value: 'individual', label: 'ფიზიკური პირი' },
    { value: 'company', label: 'იურიდიული პირი' },
  ];

  readonly deliveryTypeOptions: ComboboxItems[] = [
    { value: 'delivery', label: 'მიტანა' },
    { value: 'pickup', label: 'გატანა' },
  ];

  readonly deliveryTimeOptions: ComboboxItems[] = [
    { value: 'same_day', label: '1 საათში მიწოდება' },
    { value: 'next_day', label: 'მომდევნო სამუშაო დღეს' },
  ];

  private readonly defaultModel: PaymentLinkFields = {
    customer_type: 'individual',
    individual: { name: '', surname: '' },
    company: { organization_type: 'llc', organization_name: '', organization_code: '' },
    email: '',
    phone_number: '',
    address: '',
    city: '',
    region: '',
    details: '',
    delivery_type: 'delivery',
    delivery_time: 'next_day',
    comment: '',
    price: '',
    items: [],
  };

  readonly paymentLinkModel = signal<PaymentLinkFields>(structuredClone(this.defaultModel));

  readonly paymentLinkForm = form(this.paymentLinkModel, (fieldPath) => {
    required(fieldPath.customer_type, { message: 'პირის არჩევა აუცილებელია' });

    hidden(fieldPath.individual, ({ valueOf }) => valueOf(fieldPath.customer_type) === 'company');
    required(fieldPath.individual.name, { message: 'სახელი აუცილებელია' });
    required(fieldPath.individual.surname, { message: 'გვარი აუცილებელია' });

    hidden(fieldPath.company, ({ valueOf }) => valueOf(fieldPath.customer_type) === 'individual');
    required(fieldPath.company.organization_name, { message: 'ორგანიზაციის სახელი აუცილებელია' });
    required(fieldPath.company.organization_code, { message: 'საიდენტიფიკაციო კოდი აუცილებელია' });

    required(fieldPath.email, { message: 'ელ. ფოსტა აუცილებელია' });
    email(fieldPath.email, { message: 'შეიყვანეთ სწორი ელ. ფოსტა' });
    required(fieldPath.phone_number, { message: 'ტელეფონის ნომერი აუცილებელია' });

    hidden(fieldPath.address, ({ valueOf }) => valueOf(fieldPath.delivery_type) === 'pickup');
    required(fieldPath.address, { message: 'მისამართი აუცილებელია' });

    hidden(fieldPath.delivery_time, ({ valueOf }) => valueOf(fieldPath.delivery_type) === 'pickup');
    required(fieldPath.delivery_time, { message: 'მიწოდების დრო აუცილებელია' });

    validate(fieldPath.price, ({ value }) => {
      const price = parseFloat(value());
      return isNaN(price) || price <= 0
        ? minError(0, { message: 'თანხა უნდა იყოს 0-ზე მეტი' })
        : null;
    });

    validate(fieldPath.items, ({ value }) =>
      value().length === 0 ? requiredError({ message: 'დაამატეთ მინიმუმ ერთი პროდუქტი' }) : null,
    );
    applyEach(fieldPath.items, (itemPath) => {
      required(itemPath.product_id, { message: 'პროდუქტის ID აუცილებელია' });
      required(itemPath.product_name, { message: 'პროდუქტის სახელი აუცილებელია' });
      min(itemPath.quantity, 1, { message: 'რაოდენობა უნდა იყოს 0-ზე მეტი' });
      validate(itemPath.price, ({ value }) => {
        const price = parseFloat(value());
        return isNaN(price) || price <= 0
          ? minError(0, { message: 'ფასი უნდა იყოს 0-ზე მეტი' })
          : null;
      });
    });
  });

  // Result
  readonly isLoading = signal(false);
  readonly submitted = signal(false);
  readonly checkoutUrl = signal<string | null>(null);
  readonly orderId = signal<string | null>(null);
  readonly copied = signal(false);

  readonly isPickup = computed(() => this.paymentLinkForm.delivery_type().value() === 'pickup');

  readonly isTbilisi = computed(() => this.paymentLinkForm.city().value() === 'tbilisi');

  readonly errorMessage = computed(() => {
    const errors = this.paymentLinkForm().errorSummary();
    return errors.length > 0 ? errors[0].message || 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი' : '';
  });

  readonly total = computed(() =>
    this.paymentLinkModel().items.reduce((sum, item) => {
      const price = parseFloat(item.price);
      return sum + (isNaN(price) ? 0 : price * item.quantity);
    }, 0),
  );

  // Product search
  readonly searchQuery = signal<string>('');
  readonly searchTerm = signal<string>('');
  private searchTimer?: number;

  readonly searchResource = rxResource({
    defaultValue: { products: [], total: 0, limit: 0, offset: 0 } as any,
    params: () => this.searchTerm(),
    stream: ({ params }) => {
      if (!params) return of({ products: [], total: 0, limit: 0, offset: 0 } as any);
      const isId = /^[a-zA-Z0-9_-]{8,}$/.test(params) && !/\s/.test(params);
      const qs = isId
        ? `id=${encodeURIComponent(params)}&limit=10`
        : `query=${encodeURIComponent(params)}&limit=10`;
      return this.adminService
        .searchProduct(qs)
        .pipe(catchError(() => of({ products: [], total: 0, limit: 0, offset: 0 } as any)));
    },
  });

  readonly searchResults = computed<ProductResponse[]>(
    () => this.searchResource.value()?.products ?? [],
  );

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = window.setTimeout(() => this.searchTerm.set(value.trim()), 350);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchTerm.set('');
  }

  getImage(product: ProductResponse): string {
    const primary = product.images.find((i) => i.is_primary) ?? product.images[0];
    if (!primary) return '';
    return getProductImageUrl(product.data.id, primary.image_uuid, primary.extension);
  }

  addProduct(product: ProductResponse): void {
    const data = product.data;
    const price = Number(data.price) || 0;
    const discount = Number(data.discount) || 0;
    const unitPrice = discount > 0 ? price - discount : price;
    this.paymentLinkModel.update((model) => ({
      ...model,
      items: [
        ...model.items,
        {
          product_id: data.id,
          product_name: data.name,
          color: '',
          quantity: 1,
          price: unitPrice.toFixed(2),
        },
      ],
    }));
    this.clearSearch();
  }

  removeItem(index: number): void {
    this.paymentLinkModel.update((model) => ({
      ...model,
      items: model.items.filter((_, i) => i !== index),
    }));
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);

    submit(this.paymentLinkForm, async () => {
      this.dispatch();
      return [];
    });
  }

  private dispatch(): void {
    const model = this.paymentLinkModel();

    const items: PaymentLinkItem[] = model.items.map((item) => ({
      product_id: item.product_id.trim(),
      product_name: item.product_name.trim(),
      color: item.color.trim() || null,
      quantity: item.quantity,
      price: parseFloat(item.price).toFixed(2),
    }));

    const customer: PaymentLinkCustomer =
      model.customer_type === 'individual'
        ? {
            customer_type: 'individual',
            name: model.individual.name.trim(),
            surname: model.individual.surname.trim(),
          }
        : {
            customer_type: 'company',
            organization_type: model.company.organization_type,
            organization_name: model.company.organization_name.trim(),
            organization_code: model.company.organization_code.trim(),
          };

    const payload: PaymentLinkRequest = {
      customer,
      email: model.email.trim(),
      phone_number: model.phone_number.trim(),
      address: model.address.trim(),
      city: model.city || null,
      region: model.city === 'tbilisi' ? model.region || null : null,
      details: model.details.trim() || null,
      delivery_type: model.delivery_type,
      delivery_time: model.delivery_time,
      comment: model.comment.trim() || null,
      items,
      price: parseFloat(model.price).toFixed(2),
    };

    this.isLoading.set(true);
    this.checkoutUrl.set(null);

    this.adminService
      .createPaymentLink(payload)
      .pipe(
        catchError((err) => {
          this.isLoading.set(false);
          const message = err?.error?.message || 'გადახდის ბმულის შექმნა ვერ მოხერხდა';
          this.toastService.add('შეცდომა', message, 5000, 'error');
          return of(null);
        }),
      )
      .subscribe((response) => {
        this.isLoading.set(false);
        if (response) {
          this.orderId.set(response.order_id);
          this.checkoutUrl.set(response.checkout_url);
          this.toastService.add('წარმატებული', 'გადახდის ბმული შეიქმნა', 3000, 'success');
        }
      });
  }

  copyLink(): void {
    const url = this.checkoutUrl();
    if (!url || typeof navigator === 'undefined') return;
    navigator.clipboard.writeText(url).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  reset(): void {
    this.checkoutUrl.set(null);
    this.orderId.set(null);
    this.submitted.set(false);
    this.paymentLinkModel.set(structuredClone(this.defaultModel));
  }
}
