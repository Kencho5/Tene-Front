import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  ProductFacets,
  ProductResponse,
  ProductSearchResponse,
} from '@core/interfaces/products.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private readonly http = inject(HttpClient);

  searchProduct(params: string): Observable<ProductSearchResponse> {
    return this.http.get<ProductSearchResponse>(`/products?${params}`);
  }

  getProduct(product_id: string | number): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`/products/${product_id}`);
  }

  getFacets(params: string): Observable<ProductFacets> {
    return this.http.get<ProductFacets>(`/products/facets?${params}`);
  }
}
