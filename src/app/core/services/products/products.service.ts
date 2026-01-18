import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ProductResponse } from '@core/interfaces/products.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private readonly http = inject(HttpClient);

  searchProduct(params: string): Observable<ProductResponse[]> {
    return this.http.get<ProductResponse[]>(`/products?${params}`);
  }

  getProduct(product_id: string): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`/products/${product_id}`);
  }
}
