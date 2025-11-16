export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  discount: number;
  colors: string[];
  quantity: number;
  specifications: string;
  image_url: string;
  product_type: string;
  created_at: string;
  updated_at: string;
}
