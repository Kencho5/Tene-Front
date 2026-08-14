import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, FormField, required } from '@angular/forms/signals';
import { catchError, of } from 'rxjs';
import { ComboboxItems } from '@core/interfaces/combobox.interface';
import {
  CreateOrderItem,
  CreateOrderRequest,
  OrderFormFields,
  OrderItemFields,
} from '@core/interfaces/admin/orders.interface';
import { ProductResponse, ProductSearchResponse } from '@core/interfaces/products.interface';
import { AdminService } from '@core/services/admin/admin.service';
import { ToastService } from '@core/services/toast.service';
import { ComboboxComponent } from '@shared/components/ui/combobox/combobox.component';
import { DropdownComponent } from '@shared/components/ui/dropdown/dropdown.component';
import { InputComponent } from '@shared/components/ui/input/input.component';
import { SharedModule } from '@shared/shared.module';
import { colorLabels } from '@utils/colors';
import { organizationTypes } from '@utils/organizationTypes';
import { getProductImageUrl } from '@utils/product-image-url';
import { calculateDiscount } from '@utils/discountedPrice';
import { TBILISI_REGIONS } from '../../checkout/checkout.config';

const EMPTY_SEARCH: ProductSearchResponse = { products: [], total: 0, limit: 0, offset: 0 };

@Component({
  selector: 'app-admin-order-form',
  imports: [SharedModule, InputComponent, FormField, ComboboxComponent, DropdownComponent],
  templateUrl: './admin-order-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrderFormComponent {
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toastService = inject(ToastService);
  private searchTimer?: number;

  readonly organizationTypes = organizationTypes;
  readonly regionOptions = TBILISI_REGIONS;

  readonly colorOptions: ComboboxItems[] = Object.entries(colorLabels).map(([value, label]) => ({
    label,
    value,
  }));

  readonly statusOptions: ComboboxItems[] = [
    { label: 'შექმნილი', value: 'created' },
    { label: 'დადასტურებული', value: 'approved' },
    { label: 'მოლოდინში', value: 'pending' },
    { label: 'მუშავდება', value: 'processing' },
    { label: 'მომზადებულია', value: 'prepared' },
    { label: 'გაგზავნილია', value: 'shipped' },
    { label: 'ფინანში გატარებულია', value: 'finance_cleared' },
    { label: 'თანხა დაბრუნებულია', value: 'refunded' },
  ];

  readonly paymentMethodOptions: ComboboxItems[] = [
    { label: 'POS — BOG', value: 'pos_bog' },
    { label: 'POS — TBC', value: 'pos_tbc' },
    { label: 'POS — Liberty', value: 'pos_liberty' },
    { label: 'ნაღდი', value: 'cash' },
    { label: 'ჩარიცხვა — საქართველოს ბანკი', value: 'transfer_bog' },
    { label: 'ჩარიცხვა — თიბისი', value: 'transfer_tbc' },
    { label: 'ჩარიცხვა — extra.ge', value: 'transfer_extra' },
  ];

  readonly fulfillmentMethodOptions: ComboboxItems[] = [
    { label: 'მაღაზიიდან გატანა', value: 'store_pickup' },
    { label: 'საკურიერო მომსახურება', value: 'courier' },
  ];

  readonly customerTypeOptions: ComboboxItems[] = [
    { label: 'ფიზიკური პირი', value: 'individual' },
    { label: 'იურიდიული პირი', value: 'company' },
  ];

  readonly deliveryTypeOptions: ComboboxItems[] = [
    { label: 'მიტანა', value: 'delivery' },
    { label: 'გატანა', value: 'pickup' },
  ];

  readonly deliveryTimeOptions: ComboboxItems[] = [
    { label: 'იმავე დღეს', value: 'same_day' },
    { label: 'მეორე დღეს', value: 'next_day' },
  ];

  private readonly defaultModel: OrderFormFields = {
    status: 'created',
    customer_type: 'individual',
    customer_name: '',
    customer_surname: '',
    organization_type: 'llc',
    organization_name: '',
    organization_code: '',
    email: '',
    phone_number: '',
    city: '',
    region: '',
    address: '',
    details: '',
    delivery_type: 'delivery',
    delivery_time: '',
    comment: '',
    amount: '',
    payment_method: 'pos_bog',
    fulfillment_method: 'store_pickup',
    personal_number: '',
    source_comment: '',
    is_installment_sale: false,
    is_product_exchange: false,
  };

  readonly orderModel = signal<OrderFormFields>(structuredClone(this.defaultModel));

  readonly orderForm = form(this.orderModel, (fieldPath) => {
    required(fieldPath.phone_number, { message: 'ტელეფონის ნომერი აუცილებელია' });
  });

  readonly submitted = signal(false);
  readonly isLoading = signal(false);
  readonly items = signal<OrderItemFields[]>([]);

  readonly isCompany = computed(() => this.orderModel().customer_type === 'company');
  readonly isDelivery = computed(() => this.orderModel().delivery_type === 'delivery');

  readonly searchQuery = signal('');
  readonly searchTerm = signal('');

  readonly searchResource = rxResource({
    defaultValue: EMPTY_SEARCH,
    params: () => this.searchTerm(),
    stream: ({ params }) => {
      if (!params) return of(EMPTY_SEARCH);
      const isId = /^[a-zA-Z0-9_-]{8,}$/.test(params) && !/\s/.test(params);
      const qs = isId
        ? `id=${encodeURIComponent(params)}&limit=10`
        : `query=${encodeURIComponent(params)}&limit=10`;
      return this.adminService.searchProduct(qs);
    },
  });

  readonly searchResults = computed<ProductResponse[]>(
    () => this.searchResource.value()?.products ?? [],
  );

  readonly itemsTotal = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  readonly resolvedAmount = computed(() => {
    const manual = Number(this.orderModel().amount.trim());
    if (this.orderModel().amount.trim() && !isNaN(manual)) return manual;
    return this.itemsTotal();
  });

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

  getImage(product: ProductResponse): string | null {
    const image = product.images?.find((img) => img.is_primary) ?? product.images?.[0];
    if (!image) return null;
    return getProductImageUrl(product.data.id, image.image_uuid, image.extension);
  }

  addProduct(product: ProductResponse): void {
    const price = calculateDiscount(product.data);

    this.items.update((list) => [
      ...list,
      {
        product_id: product.data.id,
        product_name: product.data.name,
        color: product.images?.find((img) => img.is_primary)?.color ?? '',
        quantity: 1,
        price,
        image_url: this.getImage(product),
      },
    ]);
    this.clearSearch();
  }

  addCustomItem(): void {
    this.items.update((list) => [
      ...list,
      {
        product_id: '',
        product_name: '',
        color: '',
        quantity: 1,
        price: 0,
        image_url: null,
      },
    ]);
  }

  removeItem(index: number): void {
    this.items.update((list) => list.filter((_, i) => i !== index));
  }

  updateItem(index: number, patch: Partial<OrderItemFields>): void {
    this.items.update((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  onItemNameInput(index: number, event: Event): void {
    this.updateItem(index, { product_name: (event.target as HTMLInputElement).value });
  }

  onItemProductIdInput(index: number, event: Event): void {
    this.updateItem(index, { product_id: (event.target as HTMLInputElement).value });
  }

  onItemQuantityInput(index: number, event: Event): void {
    const quantity = Number((event.target as HTMLInputElement).value);
    this.updateItem(index, { quantity: quantity > 0 ? quantity : 1 });
  }

  onItemPriceInput(index: number, event: Event): void {
    const price = Number((event.target as HTMLInputElement).value);
    this.updateItem(index, { price: isNaN(price) || price < 0 ? 0 : price });
  }

  onItemColorChange(index: number, color: string | undefined): void {
    this.updateItem(index, { color: color ?? '' });
  }

  formatPrice(value: number): string {
    return value.toFixed(2);
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    this.submitted.set(true);

    if (this.orderForm().invalid()) {
      const errors = this.orderForm().errorSummary();
      const message =
        errors.length > 0 && errors[0].message
          ? errors[0].message
          : 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი';
      this.toastService.add('შეცდომა', message, 5000, 'error');
      return;
    }

    this.isLoading.set(true);

    this.adminService
      .createOrder(this.buildPayload())
      .pipe(
        catchError((err) => {
          this.isLoading.set(false);
          const message = err?.error?.message || 'შეკვეთის შექმნა ვერ მოხერხდა';
          this.toastService.add('შეცდომა', message, 5000, 'error');
          return of(null);
        }),
      )
      .subscribe((order) => {
        this.isLoading.set(false);
        if (order) {
          this.toastService.add('წარმატებული', `შეკვეთა შეიქმნა: ${order.order_id}`, 3000, 'success');
          this.router.navigate(['/admin/orders']);
        }
      });
  }

  private buildPayload(): CreateOrderRequest {
    const model = this.orderModel();
    const isCompany = model.customer_type === 'company';

    const items: CreateOrderItem[] = this.items().map((item) => ({
      product_id: item.product_id.trim(),
      color: item.color.trim(),
      quantity: item.quantity,
      price: item.price,
      product_name: item.product_name.trim(),
    }));

    const payload: CreateOrderRequest = {
      status: model.status,
      payment_method: model.payment_method,
      fulfillment_method: model.fulfillment_method,
      amount: this.resolvedAmount(),
      customer_type: model.customer_type,
      email: model.email.trim(),
      phone_number: model.phone_number.trim(),
      address: model.address.trim(),
      city: model.city.trim(),
      region: model.region.trim(),
      details: model.details.trim(),
      delivery_type: model.delivery_type,
      delivery_time: model.delivery_type === 'pickup' ? '' : model.delivery_time,
      comment: model.comment.trim(),
      source_comment: model.source_comment.trim(),
      personal_number: model.personal_number.trim(),
      is_installment_sale: model.is_installment_sale,
      is_product_exchange: model.is_product_exchange,
      items,
    };

    if (isCompany) {
      payload.organization_type = model.organization_type;
      payload.organization_name = model.organization_name.trim();
      payload.organization_code = model.organization_code.trim();
    } else {
      payload.customer_name = model.customer_name.trim();
      payload.customer_surname = model.customer_surname.trim();
    }

    return payload;
  }

  cancel(): void {
    this.router.navigate(['/admin/orders']);
  }
}
