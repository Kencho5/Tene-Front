export interface CreateOrderItem {
  product_id: string;
  color?: string;
  quantity: number;
  price: number;
  product_name: string;
  cable_config?: { watts: number; length_cm: number } | null;
}

export interface CreateOrderRequest {
  status?: string;
  amount?: number;
  customer_type?: string;
  customer_name?: string;
  customer_surname?: string;
  organization_type?: string;
  organization_name?: string;
  organization_code?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  region?: string;
  details?: string;
  delivery_type?: string;
  delivery_time?: string;
  comment?: string;
  user_id?: number;
  items?: CreateOrderItem[];
}

export interface OrderItemFields {
  product_id: string;
  product_name: string;
  color: string;
  quantity: number;
  price: number;
  image_url: string | null;
}

export interface OrderFormFields {
  status: string;
  customer_type: string;
  customer_name: string;
  customer_surname: string;
  organization_type: string;
  organization_name: string;
  organization_code: string;
  email: string;
  phone_number: string;
  city: string;
  region: string;
  address: string;
  details: string;
  delivery_type: string;
  delivery_time: string;
  comment: string;
  amount: string;
}
