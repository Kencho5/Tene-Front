import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { ProductResponse } from '@core/interfaces/products.interface';
import { SharedModule } from '@shared/shared.module';
import { ImageComponent } from '../image/image.component';
import { calculateDiscount } from '@utils/discountedPrice';
import { CartService } from '@core/services/products/cart.service';
import { generateProductSlug } from '@utils/slug';
import { getProductImageUrl } from '@utils/product-image-url';

@Component({
  selector: 'app-product-card',
  imports: [SharedModule, ImageComponent],
  templateUrl: './product-card.component.html',
})
export class ProductCardComponent {
  readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  readonly product = input.required<ProductResponse>();
  readonly priority = input<boolean>(false);

  readonly productSlug = computed(() => {
    return generateProductSlug(this.product().data.name);
  });

  readonly discountedPrice = computed(() => {
    return calculateDiscount(this.product().data);
  });

  readonly primaryImage = computed(() => {
    return this.product().images.find((image) => image.is_primary) ?? null;
  });

  readonly productImage = computed(() => {
    const primaryImage = this.primaryImage();
    if (!primaryImage) return '';

    return getProductImageUrl(
      this.product().data.id,
      primaryImage.image_uuid,
      primaryImage.extension,
    );
  });

  readonly primaryImageQuantity = computed(() => {
    return this.primaryImage()?.quantity ?? 0;
  });

  readonly categoryName = computed(() => {
    return this.product().categories?.[0]?.name ?? null;
  });

  readonly savingsAmount = computed(() => {
    const data = this.product().data;
    const discount = Number(data.discount);
    if (!discount) return 0;
    return Number(data.price) - Number(this.discountedPrice());
  });

  readonly stockBadge = computed(() => {
    const qty = this.primaryImageQuantity();
    if (qty === 0) return { type: 'out' as const };
    if (qty <= 3) return { type: 'low' as const, qty };
    return { type: 'in' as const };
  });

  private static readonly SPEC_HIGHLIGHT_KEYS = [
    'კაბელის სიგრძე',
    'გამომავალი სიმძლავრე',
    'სიმძლავრე (Watt)',
    'კონექტორები',
    'Bluetooth',
    'მუშაობის დრო',
    'შიდა მეხსიერება',
    'ოპერატიული მეხსიერება',
    'ეკრანის ზომა',
    'მეგაპიქსელების რაოდენობა',
    'პროცესორი',
    'მოქმედების რადიუსი',
  ];

  readonly specHighlights = computed<{ name: string; value: string }[]>(() => {
    const specs = this.product().data.specifications;
    if (!specs) return [];
    const flat: { name: string; value: string }[] = [];
    for (const group of Object.values(specs)) {
      for (const item of group) flat.push(item);
    }
    const seen = new Set<string>();
    const picked: { name: string; value: string }[] = [];
    for (const key of ProductCardComponent.SPEC_HIGHLIGHT_KEYS) {
      const hit = flat.find((s) => s.name === key);
      if (hit && !seen.has(hit.name)) {
        seen.add(hit.name);
        picked.push(hit);
        if (picked.length === 2) break;
      }
    }
    return picked;
  });

  formatPrice(price: number): string {
    const num = Number(price);
    return num >= 1000 ? Math.round(num).toString() : num.toFixed(2);
  }

  addToCart(): void {
    const productData = this.product().data;
    const primaryImage = this.primaryImage();

    if (!productData || !primaryImage || primaryImage.quantity === 0) return;

    this.cartService.addItem({
      product: productData,
      quantity: 1,
      selectedColor: primaryImage.color,
      selectedImageId: primaryImage.image_uuid,
      selectedImageExtension: primaryImage.extension,
      selectedImageQuantity: primaryImage.quantity,
    });

    this.router.navigate(['/cart']);
  }
}
