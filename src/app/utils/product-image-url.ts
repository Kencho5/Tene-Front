import { environment } from '@environments/environment';

export function getProductImageUrl(
  productId: number,
  imageUuid: string,
): string {
  return `${environment.product_image_url}/products-${environment.environment}/${productId}/${imageUuid}.jpg`;
}

export function getProductImageBaseUrl(): string {
  return `${environment.product_image_url}/products-${environment.environment}`;
}
