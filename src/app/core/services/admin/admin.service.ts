import { HttpClient, HttpHeaders, HttpStatusCode } from '@angular/common/http';
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
export class AdminService {
  private readonly http = inject(HttpClient);

  createProduct(payload: CreateProductPayload): Observable<ProductResponse> {
    return this.http.post<ProductResponse>('/admin/products', payload);
  }

  updateProduct(
    productId: number,
    payload: CreateProductPayload,
  ): Observable<ProductResponse> {
    return this.http.put<ProductResponse>(
      `/admin/products/${productId}`,
      payload,
    );
  }

  getPresignedUrls(
    productId: number,
    images: ImageUploadRequest[],
  ): Observable<PresignedUrlResponse> {
    return this.http.put<PresignedUrlResponse>(
      `/admin/products/${productId}/images`,
      { images },
    );
  }

  uploadToS3(url: string, file: File): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': file.type });

    return this.http.put(url, file, { headers });
  }

  deleteProduct(id: number): Observable<HttpStatusCode> {
    return this.http.delete<HttpStatusCode>(`/admin/products/${id}`);
  }

  deleteProductImage(
    productId: number,
    imageUuid: string,
  ): Observable<HttpStatusCode> {
    return this.http.delete<HttpStatusCode>(
      `/admin/products/${productId}/images/${imageUuid}`,
    );
  }

  updateProductImage(
    productId: number,
    imageUuid: string,
    payload: { color?: string; is_primary?: boolean },
  ): Observable<any> {
    return this.http.patch(
      `/admin/products/${productId}/images/${imageUuid}`,
      payload,
    );
  }
}
