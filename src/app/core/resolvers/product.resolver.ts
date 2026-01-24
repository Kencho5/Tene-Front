import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { ProductResponse } from '@core/interfaces/products.interface';
import { ProductsService } from '@core/services/products/products.service';
import { catchError, of } from 'rxjs';

export const productResolver: ResolveFn<ProductResponse | null> = (route) => {
  const productsService = inject(ProductsService);
  const productId = route.paramMap.get('product_id');

  if (!productId) {
    return of(null);
  }

  return productsService.getProduct(productId).pipe(
    catchError((error) => {
      console.error('Failed to load product in resolver:', error);
      return of(null);
    }),
  );
};
