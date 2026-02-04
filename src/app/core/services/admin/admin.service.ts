import { HttpClient, HttpHeaders, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  ProductResponse,
  ProductSearchResponse,
} from '@core/interfaces/products.interface';
import { Observable } from 'rxjs';
import {
  CreateProductPayload,
  ImageUploadRequest,
  PresignedUrlResponse,
} from '@core/interfaces/admin/products.interface';
import {
  UserResponse,
  UserSearchResponse,
  UserRequest,
} from '@core/interfaces/admin/users.interface';
import {
  CategoryRequest,
  CategoryResponse,
  CategoryTreeResponse,
  CategoryImageUploadRequest,
  CategoryImagePresignedResponse,
} from '@core/interfaces/categories.interface';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly http = inject(HttpClient);

  searchProduct(params: string): Observable<ProductSearchResponse> {
    return this.http.get<ProductSearchResponse>(`/admin/products?${params}`);
  }

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

  // User Management
  searchUsers(query: string): Observable<UserSearchResponse> {
    return this.http.get<UserSearchResponse>(`/admin/users?${query}`);
  }

  updateUser(userId: number, payload: UserRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`/admin/users/${userId}`, payload);
  }

  deleteUser(userId: number): Observable<HttpStatusCode> {
    return this.http.delete<HttpStatusCode>(`/admin/users/${userId}`);
  }

  // Category Management
  getAdminCategoryTree(): Observable<CategoryTreeResponse> {
    return this.http.get<CategoryTreeResponse>('/admin/categories/tree');
  }

  createCategory(payload: CategoryRequest): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>('/admin/categories', payload);
  }

  updateCategory(
    categoryId: number,
    payload: CategoryRequest,
  ): Observable<CategoryResponse> {
    return this.http.put<CategoryResponse>(
      `/admin/categories/${categoryId}`,
      payload,
    );
  }

  deleteCategory(categoryId: number): Observable<HttpStatusCode> {
    return this.http.delete<HttpStatusCode>(`/admin/categories/${categoryId}`);
  }

  // Category Image Management
  getCategoryImagePresignedUrl(
    categoryId: number,
    payload: CategoryImageUploadRequest,
  ): Observable<CategoryImagePresignedResponse> {
    return this.http.put<CategoryImagePresignedResponse>(
      `/admin/categories/${categoryId}/image`,
      payload,
    );
  }

  deleteCategoryImage(
    categoryId: number,
    imageUuid: string,
  ): Observable<HttpStatusCode> {
    return this.http.delete<HttpStatusCode>(
      `/admin/categories/${categoryId}/image/${imageUuid}`,
    );
  }

  // Product Category Assignment
  assignProductCategories(
    productId: number,
    categoryIds: number[],
  ): Observable<any> {
    return this.http.put(`/admin/products/${productId}/categories`, {
      category_ids: categoryIds,
    });
  }
}
