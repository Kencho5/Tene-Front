import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  ProductFacets,
  ProductResponse,
  ProductSearchResponse,
} from '@core/interfaces/products.interface';
import { Observable } from 'rxjs';
import {
  CreateProductPayload,
  ImageUploadRequest,
  PresignedUrlResponse,
} from '@core/interfaces/products.interface';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private readonly http = inject(HttpClient);

  searchProduct(params: string): Observable<ProductSearchResponse> {
    return this.http.get<ProductSearchResponse>(`/products?${params}`);
  }

  getProduct(product_id: string): Observable<ProductResponse> {
    return this.http.get<ProductResponse>(`/products/${product_id}`);
  }

  getFacets(params: string): Observable<ProductFacets> {
    return this.http.get<ProductFacets>(`/products/facets?${params}`);
  }

  createProduct(payload: CreateProductPayload): Observable<ProductResponse> {
    return this.http.post<ProductResponse>('/admin/products', payload);
  }

  getPresignedUrls(
    productId: number,
    images: ImageUploadRequest[],
  ): Observable<PresignedUrlResponse> {
    return this.http.post<PresignedUrlResponse>(
      `/admin/products/${productId}/images`,
      { images },
    );
  }

  uploadToS3(url: string, file: File): Observable<any> {
    return this.http.put(url, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
  }
}
