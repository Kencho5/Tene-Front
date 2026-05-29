import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export type CheckoutStepKey = 'contact' | 'delivery' | 'review' | 'payment';

export interface CheckoutAnalyticsEvent {
  session_id: string;
  type: 'session_start' | 'field_change' | 'step_view' | 'purchase';
  step: CheckoutStepKey;
  step_index: number;
  field?: string;
  value?: string;
  order_id?: string;
  is_guest: boolean;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutAnalyticsService {
  private readonly http = inject(HttpClient);

  track(event: CheckoutAnalyticsEvent): Observable<void> {
    return this.http.post<void>('/checkout/analytics', event);
  }

  send(event: CheckoutAnalyticsEvent): void {
    this.track(event).subscribe({ error: () => {} });
  }
}
