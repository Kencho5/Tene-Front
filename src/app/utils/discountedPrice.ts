import { Product } from '@core/interfaces/products.interface';

export function calculateDiscount(product: Product) {
  if (product.discounted_price == null) {
    return Number(product.price);
  }

  return Number(product.discounted_price);
}
