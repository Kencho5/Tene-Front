import { HttpClient, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  ProductFacets,
  ProductResponse,
  ProductSearchResponse,
} from '@core/interfaces/products.interface';
import { CableType } from '@core/interfaces/admin/cable-types.interface';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private readonly http = inject(HttpClient);

  searchProduct(params: string): Observable<ProductSearchResponse> {
    return this.http.get<ProductSearchResponse>(`/products?${params}`);
  }

  getTopProducts(limit?: number): Observable<ProductResponse[]> {
    const query = limit != null ? `?limit=${limit}` : '';
    return this.http.get<ProductResponse[]>(`/top-products${query}`);
  }

  getProduct(product_id: string | number): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`/products/${product_id}`);
  }

  getRelatedProducts(productId: string): Observable<ProductResponse[]> {
    return this.http.get<ProductResponse[]>(`/products/${productId}/related`);
  }

  getFacets(params: string): Observable<ProductFacets> {
    return this.http.get<ProductFacets>(`/products/facets?${params}`);
  }

  addProductViews(product_id: string, user_id: number | null): Observable<HttpStatusCode> {
    return this.http.post<HttpStatusCode>(`/products/${product_id}/views`, { user_id });
  }

  getCableType(id: number): Observable<CableType> {
    return this.http.get<CableType>(`/cable-types/${id}`);
  }
}
