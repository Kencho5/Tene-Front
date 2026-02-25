export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  discount: number;
  quantity: number;
  specifications: string;
  warranty: string;
  brand_id: number;
  brand_name: string;
  enabled: boolean;
  categories: ProductCategory[];
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  product_id: number;
  image_uuid: string;
  color: string;
  is_primary: boolean;
  extension: string;
}

export interface ProductResponse {
  data: Product;
  images: ProductImage[];
  categories: ProductCategory[];
}

export interface ProductSearchResponse {
  products: ProductResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor: string;
  selectedImageId: string;
  selectedImageExtension: string;
}

export interface CheckoutFields {
  customer_type: string;
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
  phone_number: number | null;
  address: string;
  delivery_type: string;
  delivery_time: string;
}

export interface ProductCategoryCard {
  text: string;
  image: string;
  route: string;
  color?: string;
}

export interface CheckoutRequest {
  customer_type: string;
  individual: { name: string; surname: string } | null;
  company: {
    organization_type: string;
    organization_name: string;
    organization_code: string;
  } | null;
  email: string;
  phone_number: number;
  address: string;
  delivery_type: string;
  delivery_time: string;
  items: { product_id: number; quantity: number }[];
}

export interface CheckoutResponse {
  order_id: string;
  checkout_url: string;
}

export interface Order {
  id: number;
  user_id: number;
  order_id: string;
  status: 'pending' | 'approved' | 'declined' | 'expired' | 'processing';
  payment_id: number | null;
  amount: number;
  currency: string;
  customer_type: string;
  customer_name: string | null;
  customer_surname: string | null;
  organization_type: string | null;
  organization_name: string | null;
  organization_code: string | null;
  email: string;
  phone_number: number;
  address: string;
  delivery_type: string;
  delivery_time: string;
  checkout_url: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price_at_purchase: number;
  product_name: string;
  product_image: ProductImage | null;
  created_at: string;
}

export interface OrderSearchResponse {
  orders: Order[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProductBrandCard {
  brand: string;
  title: string;
  color: string;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface BrandFacet {
  id: number;
  name: string;
  count: number;
}

export interface CategoryFacet {
  id: number;
  name: string;
  count: number;
}

export interface ProductFacets {
  brands: BrandFacet[];
  colors: FacetValue[];
  categories: CategoryFacet[];
}
