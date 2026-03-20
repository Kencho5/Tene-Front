import { environment } from '@environments/environment';

export function getProductImageUrl(
  productId: string,
  imageUuid: string,
  extension: string,
): string {
  return `${environment.product_image_url}/products-${environment.branch}/${productId}/${imageUuid}.${extension}`;
}

export function getProductImageBaseUrl(): string {
  return `${environment.product_image_url}/products-${environment.branch}`;
}
