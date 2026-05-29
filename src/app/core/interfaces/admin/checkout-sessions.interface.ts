import { CheckoutStepKey } from '@core/services/checkout-analytics.service';

export type CheckoutEventType = 'session_start' | 'field_change' | 'step_view' | 'purchase';

export interface CheckoutSessionEvent {
  id: number;
  session_id: string;
  type: CheckoutEventType;
  step: CheckoutStepKey;
  step_index: number;
  field: string | null;
  value: string | null;
  order_id: string | null;
  is_guest: boolean;
  user_id: number | null;
  client_timestamp: number;
  created_at: string;
}

export interface CheckoutSession {
  session_id: string;
  user_id: number | null;
  is_guest: boolean;
  last_step: CheckoutStepKey | null;
  last_step_index: number | null;
  purchased: boolean;
  order_id: string | null;
  order_status: string | null;
  event_count: number;
  last_activity_at: string;
  fields: Record<string, string>;
  events: CheckoutSessionEvent[];
}

export interface CheckoutSessionSearchResponse {
  sessions: CheckoutSession[];
  total: number;
  limit: number;
  offset: number;
}
