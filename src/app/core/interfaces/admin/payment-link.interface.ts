export interface PaymentLinkItem {
  product_id: string;
  product_name: string;
  color: string | null;
  quantity: number;
  price: string;
}

interface PaymentLinkBase {
  email: string;
  phone_number: string;
  address: string;
  city: string | null;
  details: string | null;
  delivery_type: string;
  delivery_time: string;
  comment: string | null;
  items: PaymentLinkItem[];
}

export interface PaymentLinkIndividualRequest extends PaymentLinkBase {
  customer_type: 'individual';
  name: string;
  surname: string;
}

export interface PaymentLinkCompanyRequest extends PaymentLinkBase {
  customer_type: 'company';
  organization_type: string;
  organization_name: string;
  organization_code: string;
}

export type PaymentLinkRequest = PaymentLinkIndividualRequest | PaymentLinkCompanyRequest;

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
  details: string;
  delivery_type: string;
  delivery_time: string;
  comment: string;
  items: PaymentLinkItemFields[];
}
