export interface PaymentLinkRequest {
  price: string | null;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  comment: string | null;
}

export interface PaymentLinkResponse {
  order_id: string;
  checkout_url: string;
}

export interface PaymentLinkFields {
  price: string;
  email: string;
  phone_number: string;
  address: string;
  comment: string;
}
