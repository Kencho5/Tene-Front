import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CheckoutRequest,
  CheckoutResponse,
  CommentImagePresignedResponse,
  CommentImageUploadItem,
  Order,
} from '@core/interfaces/products.interface';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly http = inject(HttpClient);

  checkout(data: CheckoutRequest): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>('/checkout', data);
  }

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>('/orders');
  }

  getOrder(orderId: string): Observable<Order> {
    return this.http.get<Order>(`/orders/${orderId}`);
  }

  getCommentImagePresignedUrls(
    images: CommentImageUploadItem[],
  ): Observable<CommentImagePresignedResponse> {
    return this.http.put<CommentImagePresignedResponse>('/checkout/comment-images', { images });
  }

  uploadToS3(url: string, file: File): Observable<unknown> {
    const headers = new HttpHeaders({
      'Content-Type': file.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    return this.http.put(url, file, { headers });
  }
}
