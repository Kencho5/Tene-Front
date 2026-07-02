export interface PaymentLinkItem {
  product_id: string;
  product_name: string;
  color: string | null;
  quantity: number;
  price: string;
}

export interface PaymentLinkIndividualCustomer {
  customer_type: 'individual';
  name: string;
  surname: string;
}

export interface PaymentLinkCompanyCustomer {
  customer_type: 'company';
  organization_type: string;
  organization_name: string;
  organization_code: string;
}

export type PaymentLinkCustomer =
  | PaymentLinkIndividualCustomer
  | PaymentLinkCompanyCustomer;

export interface PaymentLinkRequest {
  customer: PaymentLinkCustomer;
  email: string;
  phone_number: string;
  address: string;
  city: string | null;
  region: string | null;
  details: string | null;
  delivery_type: string;
  delivery_time: string;
  comment: string | null;
  items: PaymentLinkItem[];
  price: string;
}

export interface PaymentLinkResponse {
  order_id: string;
  checkout_url: string;
}

export interface PaymentLinkItemFields {
  product_id: string;
  product_name: string;
  color: string;
  quantity: number;
  price: string;
}

export interface PaymentLinkFields {
  customer_type: 'individual' | 'company';
  individual: {
    name: string;
    surname: string;
  };
  company: {
    organization_type: string;
    organization_name: string;
    organization_code: string;
  };
  email: string;
  phone_number: string;
  address: string;
  city: string;
  region: string;
  details: string;
  delivery_type: string;
  delivery_time: string;
  comment: string;
  price: string;
  items: PaymentLinkItemFields[];
}
