import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Product } from '@core/interfaces/products.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private readonly http = inject(HttpClient);

  getProduct(product_id: string): Observable<Product> {
    return this.http.get<Product>(`/product/${product_id}`);
  }
}
