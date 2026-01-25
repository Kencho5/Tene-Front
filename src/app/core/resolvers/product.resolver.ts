import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { ProductResponse } from '@core/interfaces/products.interface';
import { ProductsService } from '@core/services/products/products.service';
import { catchError, of, map } from 'rxjs';
import { generateProductSlug } from '@utils/slug';

export interface ProductResolverData {
  product: ProductResponse;
  expectedSlug: string;
  slugMismatch: boolean;
}

export const productResolver: ResolveFn<ProductResolverData | null> = (
  route,
) => {
  const productsService = inject(ProductsService);

  const slug = route.paramMap.get('slug');
  const productId = route.paramMap.get('product_id');

  if (!productId) {
    return of(null);
  }

  return productsService.getProduct(productId).pipe(
    map((product) => {
      if (!product) {
        return null;
      }

      const expectedSlug = generateProductSlug(product.data.name);

      const slugMismatch = slug !== expectedSlug;

      return {
        product,
        expectedSlug,
        slugMismatch,
      };
    }),
    catchError((error) => {
      console.error('Failed to load product in resolver:', error);
      return of(null);
    }),
  );
};
