export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  discount: number;
  quantity: number;
  specifications: string;
  image_ids: string[];
  product_type: string;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  product_id: number;
  image_uuid: string;
  color: string;
  is_primary: boolean;
}

export interface ProductResponse {
  product: Product;
  images: ProductImage[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: string;
  selectedImageId: string;
}

export interface CheckoutFields {
  customer_type: string;
  name: string;
  surname: string;
  email: string;
  id_number: number | null;
  phone_number: number | null;
  address: string;
  delivery_type: string;
  delivery_time: string;
}
