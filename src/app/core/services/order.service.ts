import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CheckoutRequest,
  CheckoutResponse,
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
}
