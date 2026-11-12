import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, finalize, map, of } from 'rxjs';
import { SharedModule } from '@shared/shared.module';
import { AdminService } from '@core/services/admin/admin.service';
import {
  ComboOffer,
  ComboOfferRequest,
  ComboPricingType,
  ComboProduct,
} from '@core/interfaces/combo-offers.interface';
import { calculateDiscount } from '@utils/discountedPrice';
import { getProductImageUrl } from '@utils/product-image-url';

interface ComboItemDraft {
  product: ComboProduct;
  comboPrice: string;
}

@Component({
  selector: 'app-combo-offer-form',
  imports: [SharedModule],
  templateUrl: './combo-offer-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComboOfferFormComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly offer = input<ComboOffer | null>(null);
  readonly fixedMainProduct = input<ComboProduct | null>(null);

  readonly saved = output<ComboOffer>();
  readonly cancelled = output<void>();

  readonly mainProduct = signal<ComboProduct | null>(null);
  readonly title = signal('');
  readonly description = signal('');
  readonly enabled = signal(true);
  readonly pricingType = signal<ComboPricingType>('addon_price');
  readonly bundlePrice = signal('');
  readonly items = signal<ComboItemDraft[]>([]);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly submitted = signal(false);

  readonly mainQuery = signal('');
  readonly mainTerm = signal('');
  readonly itemQuery = signal('');
  readonly itemTerm = signal('');
  private mainTimer?: number;
  private itemTimer?: number;

  readonly mainSearch = rxResource({
    defaultValue: [] as ComboProduct[],
    params: () => this.mainTerm(),
    stream: ({ params }) => this.search(params),
  });

  readonly itemSearch = rxResource({
    defaultValue: [] as ComboProduct[],
    params: () => this.itemTerm(),
    stream: ({ params }) => this.search(params),
  });

  readonly itemResults = computed(() => {
    const excluded = new Set(this.items().map((i) => i.product.data.id));
    const main = this.mainProduct();
    if (main) excluded.add(main.data.id);
    return this.itemSearch
      .value()
      .filter((p) => !excluded.has(p.data.id) && p.data.cable_type_id == null);
  });

  readonly isBundle = computed(() => this.pricingType() === 'bundle_price');

  readonly mainRegular = computed(() => {
    const main = this.mainProduct();
    return main ? calculateDiscount(main.data) : 0;
  });

  readonly regularTotal = computed(
    () =>
      this.mainRegular() +
      this.items().reduce((sum, i) => sum + calculateDiscount(i.product.data), 0),
  );

  readonly comboTotal = computed(() => {
    if (this.isBundle()) return Number(this.bundlePrice()) || 0;
    return (
      this.mainRegular() +
      this.items().reduce((sum, i) => sum + (Number(i.comboPrice) || 0), 0)
    );
  });

  readonly isEdit = computed(() => this.offer() !== null);

  readonly bundlePriceInvalid = computed(() => !(Number(this.bundlePrice()) > 0));

  ngOnInit(): void {
    const offer = this.offer();
    this.mainProduct.set(this.fixedMainProduct() ?? offer?.main_product ?? null);
    if (!offer) return;
    this.title.set(offer.title);
    this.description.set(offer.description ?? '');
    this.enabled.set(offer.enabled);
    this.pricingType.set(offer.pricing_type);
    this.bundlePrice.set(offer.bundle_price != null ? String(Number(offer.bundle_price)) : '');
    this.items.set(
      offer.items
        .filter((i) => i.product)
        .map((i) => ({
          product: i.product!,
          comboPrice: i.combo_price != null ? String(Number(i.combo_price)) : '',
        })),
    );
  }

  regularPrice(product: ComboProduct): number {
    return calculateDiscount(product.data);
  }

  imageUrl(product: ComboProduct): string {
    const img = product.images.find((i) => i.is_primary) ?? product.images[0];
    return img ? getProductImageUrl(product.data.id, img.image_uuid, img.extension) : '';
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  onMainSearch(event: Event): void {
    const value = this.inputValue(event);
    this.mainQuery.set(value);
    clearTimeout(this.mainTimer);
    this.mainTimer = window.setTimeout(() => this.mainTerm.set(value.trim()), 350);
  }

  onItemSearch(event: Event): void {
    const value = this.inputValue(event);
    this.itemQuery.set(value);
    clearTimeout(this.itemTimer);
    this.itemTimer = window.setTimeout(() => this.itemTerm.set(value.trim()), 350);
  }

  selectMain(product: ComboProduct): void {
    this.mainProduct.set(product);
    this.items.update((list) => list.filter((i) => i.product.data.id !== product.data.id));
    this.mainQuery.set('');
    this.mainTerm.set('');
  }

  clearMain(): void {
    this.mainProduct.set(null);
  }

  addItem(product: ComboProduct): void {
    this.items.update((list) => [
      ...list,
      { product, comboPrice: String(calculateDiscount(product.data)) },
    ]);
    this.itemQuery.set('');
    this.itemTerm.set('');
  }

  removeItem(productId: string): void {
    this.items.update((list) => list.filter((i) => i.product.data.id !== productId));
  }

  setItemPrice(productId: string, value: string): void {
    this.items.update((list) =>
      list.map((i) => (i.product.data.id === productId ? { ...i, comboPrice: value } : i)),
    );
  }

  isPriceInvalid(value: string): boolean {
    return value.trim() === '' || !(Number(value) >= 0);
  }

  readonly validationError = computed<string | null>(() => {
    if (!this.mainProduct()) return 'აირჩიეთ ძირითადი პროდუქტი';
    if (!this.title().trim()) return 'მიუთითეთ სათაური';
    if (this.items().length === 0) return 'დაამატეთ მინიმუმ ერთი შეთავაზებული პროდუქტი';
    if (this.isBundle()) {
      if (this.bundlePriceInvalid()) return 'მიუთითეთ კომბოს ფიქსირებული ფასი';
    } else if (this.items().some((i) => this.isPriceInvalid(i.comboPrice))) {
      return 'მიუთითეთ კომბო ფასი ყველა პროდუქტისთვის';
    }
    return null;
  });

  submit(): void {
    this.submitted.set(true);
    if (this.validationError() || this.saving()) return;

    const payload: ComboOfferRequest = {
      main_product_id: this.mainProduct()!.data.id,
      title: this.title().trim(),
      description: this.description().trim() || null,
      pricing_type: this.pricingType(),
      bundle_price: this.isBundle() ? Number(this.bundlePrice()) : null,
      enabled: this.enabled(),
      items: this.items().map((i) => ({
        product_id: i.product.data.id,
        combo_price: this.isBundle() ? null : Number(i.comboPrice),
      })),
    };

    const offer = this.offer();
    const request = offer
      ? this.adminService.updateComboOffer(offer.id, payload)
      : this.adminService.createComboOffer(payload);

    this.saving.set(true);
    this.error.set(null);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (result) => this.saved.emit(result),
      error: (err) => this.error.set(err?.error?.message || 'შენახვა ვერ მოხერხდა'),
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  private search(term: string) {
    if (!term) return of([] as ComboProduct[]);
    return this.adminService
      .searchProduct(`query=${encodeURIComponent(term)}&limit=10`)
      .pipe(
        map((res) => res.products as ComboProduct[]),
        catchError(() => of([] as ComboProduct[])),
      );
  }
}
