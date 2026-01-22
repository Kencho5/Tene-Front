import { Product } from '@core/interfaces/products.interface';

export function calculateDiscount(product: Product) {
  const originalPrice = product.price;
  const discountPercent = product.discount;

  if (discountPercent === 0) {
    return originalPrice;
  }

  const discountAmount = (originalPrice * discountPercent) / 100;
  const priceAfterDiscount = originalPrice - discountAmount;

  return Math.round(priceAfterDiscount * 100) / 100;
}
