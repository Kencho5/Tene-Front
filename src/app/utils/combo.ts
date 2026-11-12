import { ComboOffer, ComboProduct } from '@core/interfaces/combo-offers.interface';
import { ProductImage } from '@core/interfaces/products.interface';
import { calculateDiscount } from '@utils/discountedPrice';

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function allocateBundle(bundlePrice: number, regularPrices: number[]): number[] {
  const n = regularPrices.length;
  if (n === 0) return [];
  const total = regularPrices.reduce((sum, p) => sum + p, 0);
  const out: number[] = [];
  let allocated = 0;
  regularPrices.forEach((regular, i) => {
    if (i === n - 1) {
      out.push(Math.max(0, roundMoney(bundlePrice - allocated)));
      return;
    }
    const share = total > 0 ? roundMoney((bundlePrice * regular) / total) : roundMoney(bundlePrice / n);
    allocated += share;
    out.push(share);
  });
  return out;
}

export interface ComboPricedLine {
  productId: string;
  regularPrice: number;
  unitPrice: number;
}

export function priceCombo(
  offer: ComboOffer,
  mainRegularPrice: number,
  selectedProductIds: string[],
): { main: ComboPricedLine; addons: ComboPricedLine[] } {
  const items = [...offer.items]
    .filter((i) => i.product && selectedProductIds.includes(i.product_id))
    .sort((a, b) => a.position - b.position || a.product_id.localeCompare(b.product_id));

  const addons = items.map((i) => {
    const regular = calculateDiscount(i.product!.data);
    return {
      productId: i.product_id,
      regularPrice: regular,
      unitPrice: i.combo_price == null ? regular : Number(i.combo_price),
    };
  });

  const main = {
    productId: offer.main_product_id,
    regularPrice: mainRegularPrice,
    unitPrice: mainRegularPrice,
  };

  if (offer.pricing_type === 'bundle_price') {
    const shares = allocateBundle(Number(offer.bundle_price ?? 0), [
      ...addons.map((a) => a.regularPrice),
      mainRegularPrice,
    ]);
    addons.forEach((a, i) => (a.unitPrice = shares[i]));
    main.unitPrice = shares[shares.length - 1];
  }

  return { main, addons };
}

export function defaultComboImage(product: ComboProduct): ProductImage | null {
  const inStock = product.images.filter((img) => img.quantity > 0);
  return inStock.find((img) => img.is_primary) ?? inStock[0] ?? null;
}

export function newComboGroupId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
