import { HttpClient, HttpHeaders, HttpStatusCode } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  OrderSearchResponse,
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
  CategoryImageUploadRequest,
  CategoryImagePresignedResponse,
} from '@core/interfaces/admin/categories.interface';
import { CategoryTreeResponse } from '@core/interfaces/categories.interface';
import { Brand, BrandRequest } from '@core/interfaces/admin/brands.interface';
import { AnalyticsResponse } from '@core/interfaces/admin/analytics.interface';
import {
  CableType,
  CableTypeRequest,
  CableVariant,
  CableVariantRequest,
  CableVariantUpdate,
} from '@core/interfaces/admin/cable-types.interface';
import {
  Task,
  TaskCreatePayload,
  TaskListParams,
  TaskListResponse,
  TaskMediaPresignedResponse,
  TaskMediaUploadItem,
  TaskState,
  TaskUpdatePayload,
} from '@core/interfaces/admin/tasks.interface';
import { HttpParams } from '@angular/common/http';
import {
  PaymentLinkRequest,
  PaymentLinkResponse,
} from '@core/interfaces/admin/payment-link.interface';
import { CheckoutSessionSearchResponse } from '@core/interfaces/admin/checkout-sessions.interface';
import {
  BlogCreatePayload,
  BlogListParams,
  BlogListResponse,
  BlogMediaPresignedResponse,
  BlogMediaUploadItem,
  BlogUpdatePayload,
  BlogWithMedia,
} from '@core/interfaces/admin/blogs.interface';

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

  updateProduct(productId: string, payload: CreateProductPayload): Observable<ProductResponse> {
    return this.http.put<ProductResponse>(`/admin/products/${productId}`, payload);
  }

  getPresignedUrls(
    productId: string,
    images: ImageUploadRequest[],
  ): Observable<PresignedUrlResponse> {
    return this.http.put<PresignedUrlResponse>(`/admin/products/${productId}/images`, { images });
  }

  uploadToS3(url: string, file: File): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': file.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    return this.http.put(url, file, { headers });
  }

  uploadToS3WithProgress(url: string, file: File): Observable<{ progress: number; done: boolean }> {
    return new Observable((subscriber) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.setRequestHeader('Cache-Control', 'public, max-age=31536000, immutable');

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          subscriber.next({
            progress: Math.min(99, Math.round((event.loaded / event.total) * 100)),
            done: false,
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          subscriber.next({ progress: 100, done: true });
          subscriber.complete();
        } else {
          subscriber.error(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => subscriber.error(new Error('Upload network error')));
      xhr.addEventListener('abort', () => subscriber.error(new Error('Upload aborted')));

      xhr.send(file);

      return () => {
        if (xhr.readyState !== XMLHttpRequest.DONE) xhr.abort();
      };
    });
  }

  deleteProduct(id: string): Observable<HttpStatusCode> {
    return this.http.delete<HttpStatusCode>(`/admin/products/${id}`);
  }

  deleteProductImage(productId: string, imageUuid: string): Observable<HttpStatusCode> {
    return this.http.delete<HttpStatusCode>(`/admin/products/${productId}/images/${imageUuid}`);
  }

  updateProductImage(
    productId: string,
    imageUuid: string,
    payload: { color?: string; is_primary?: boolean; quantity?: number },
  ): Observable<any> {
    return this.http.patch(`/admin/products/${productId}/images/${imageUuid}`, payload);
  }

  // Top Products
  getTopProducts(limit?: number): Observable<ProductResponse[]> {
    const query = limit != null ? `?limit=${limit}` : '';
    return this.http.get<ProductResponse[]>(`/admin/top-products${query}`);
  }

  updateTopProducts(productIds: string[]): Observable<HttpStatusCode> {
    return this.http.put<HttpStatusCode>('/admin/top-products', { product_ids: productIds });
  }

  // Order Management
  searchOrders(params: string): Observable<OrderSearchResponse> {
    return this.http.get<OrderSearchResponse>(`/admin/orders?${params}`);
  }

  exportOrders(params: string): Observable<Blob> {
    return this.http.get(`/admin/orders/export?${params}`, {
      responseType: 'blob',
    });
  }

  createPaymentLink(payload: PaymentLinkRequest): Observable<PaymentLinkResponse> {
    return this.http.post<PaymentLinkResponse>('/admin/orders/payment-link', payload);
  }

  searchCheckoutSessions(params: string): Observable<CheckoutSessionSearchResponse> {
    return this.http.get<CheckoutSessionSearchResponse>(`/admin/checkout-sessions?${params}`);
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

  updateCategory(categoryId: number, payload: CategoryRequest): Observable<CategoryResponse> {
    return this.http.put<CategoryResponse>(`/admin/categories/${categoryId}`, payload);
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

  deleteCategoryImage(categoryId: number, imageUuid: string): Observable<HttpStatusCode> {
    return this.http.delete<HttpStatusCode>(`/admin/categories/${categoryId}/image/${imageUuid}`);
  }

  assignProductCategories(productId: string, categoryIds: number[]): Observable<any> {
    return this.http.put(`/admin/products/${productId}/categories`, {
      category_ids: categoryIds,
    });
  }

  getBrands(): Observable<Brand[]> {
    return this.http.get<Brand[]>('/admin/brands');
  }

  createBrand(payload: BrandRequest): Observable<Brand> {
    return this.http.post<Brand>('/admin/brands', payload);
  }

  updateBrand(brandId: number, payload: BrandRequest): Observable<Brand> {
    return this.http.put<Brand>(`/admin/brands/${brandId}`, payload);
  }

  deleteBrand(brandId: number): Observable<HttpStatusCode> {
    return this.http.delete<HttpStatusCode>(`/admin/brands/${brandId}`);
  }

  getCableTypes(): Observable<CableType[]> {
    return this.http.get<CableType[]>('/admin/cable-types');
  }

  createCableType(payload: CableTypeRequest): Observable<CableType> {
    return this.http.post<CableType>('/admin/cable-types', payload);
  }

  updateCableType(id: number, payload: CableTypeRequest): Observable<CableType> {
    return this.http.put<CableType>(`/admin/cable-types/${id}`, payload);
  }

  deleteCableType(id: number): Observable<HttpStatusCode> {
    return this.http.delete<HttpStatusCode>(`/admin/cable-types/${id}`);
  }

  getCableVariants(typeId: number): Observable<CableVariant[]> {
    return this.http.get<CableVariant[]>(`/admin/cable-types/${typeId}/variants`);
  }

  createCableVariant(typeId: number, payload: CableVariantRequest): Observable<CableVariant> {
    return this.http.post<CableVariant>(`/admin/cable-types/${typeId}/variants`, payload);
  }

  updateCableVariant(
    typeId: number,
    variantId: number,
    payload: CableVariantUpdate,
  ): Observable<CableVariant> {
    return this.http.put<CableVariant>(
      `/admin/cable-types/${typeId}/variants/${variantId}`,
      payload,
    );
  }

  deleteCableVariant(typeId: number, variantId: number): Observable<HttpStatusCode> {
    return this.http.delete<HttpStatusCode>(`/admin/cable-types/${typeId}/variants/${variantId}`);
  }

  getAnalytics(period?: string): Observable<AnalyticsResponse> {
    return this.http.get<AnalyticsResponse>('/admin/analytics', {
      ...(period && { params: { period } }),
    });
  }

  // Task Management
  listTasks(params: TaskListParams = {}): Observable<TaskListResponse> {
    let httpParams = new HttpParams();
    if (params.state) httpParams = httpParams.set('state', params.state);
    if (params.priority) httpParams = httpParams.set('priority', params.priority);
    if (params.limit != null) httpParams = httpParams.set('limit', String(params.limit));
    if (params.offset != null) httpParams = httpParams.set('offset', String(params.offset));
    return this.http.get<TaskListResponse>('/admin/tasks', { params: httpParams });
  }

  getTask(id: number): Observable<Task> {
    return this.http.get<Task>(`/admin/tasks/${id}`);
  }

  createTask(payload: TaskCreatePayload): Observable<Task> {
    return this.http.post<Task>('/admin/tasks', payload);
  }

  updateTask(id: number, payload: TaskUpdatePayload): Observable<Task> {
    return this.http.put<Task>(`/admin/tasks/${id}`, payload);
  }

  updateTaskState(id: number, state: TaskState): Observable<Task> {
    return this.http.patch<Task>(`/admin/tasks/${id}/state`, { state });
  }

  deleteTask(id: number): Observable<HttpStatusCode> {
    return this.http.delete<HttpStatusCode>(`/admin/tasks/${id}`);
  }

  getTaskMediaPresignedUrls(
    id: number,
    items: TaskMediaUploadItem[],
  ): Observable<TaskMediaPresignedResponse> {
    return this.http.put<TaskMediaPresignedResponse>(`/admin/tasks/${id}/media`, { items });
  }

  deleteTaskMedia(id: number, mediaUuid: string): Observable<HttpStatusCode> {
    return this.http.delete<HttpStatusCode>(`/admin/tasks/${id}/media/${mediaUuid}`);
  }

  // Blog Management
  listBlogs(params: BlogListParams = {}): Observable<BlogListResponse> {
    let httpParams = new HttpParams();
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.limit != null) httpParams = httpParams.set('limit', String(params.limit));
    if (params.offset != null) httpParams = httpParams.set('offset', String(params.offset));
    return this.http.get<BlogListResponse>('/admin/blogs', { params: httpParams });
  }

  getBlog(id: number): Observable<BlogWithMedia> {
    return this.http.get<BlogWithMedia>(`/admin/blogs/${id}`);
  }

  createBlog(payload: BlogCreatePayload): Observable<BlogWithMedia> {
    return this.http.post<BlogWithMedia>('/admin/blogs', payload);
  }

  updateBlog(id: number, payload: BlogUpdatePayload): Observable<BlogWithMedia> {
    return this.http.put<BlogWithMedia>(`/admin/blogs/${id}`, payload);
  }

  deleteBlog(id: number): Observable<HttpStatusCode> {
    return this.http.delete<HttpStatusCode>(`/admin/blogs/${id}`);
  }

  getBlogMediaPresignedUrls(
    id: number,
    items: BlogMediaUploadItem[],
  ): Observable<BlogMediaPresignedResponse> {
    return this.http.put<BlogMediaPresignedResponse>(`/admin/blogs/${id}/media`, { items });
  }

  deleteBlogMedia(id: number, mediaUuid: string): Observable<HttpStatusCode> {
    return this.http.delete<HttpStatusCode>(`/admin/blogs/${id}/media/${mediaUuid}`);
  }

  setBlogMediaThumbnail(
    id: number,
    mediaUuid: string,
    isThumbnail: boolean,
  ): Observable<BlogWithMedia> {
    return this.http.patch<BlogWithMedia>(`/admin/blogs/${id}/media/${mediaUuid}/thumbnail`, {
      is_thumbnail: isThumbnail,
    });
  }
}
