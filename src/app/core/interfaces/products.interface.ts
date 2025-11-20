export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  discount: number;
  colors: string[];
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
