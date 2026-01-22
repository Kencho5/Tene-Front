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
  data: Product;
  images: ProductImage[];
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

export interface ProductBrandCard {
  brand: string;
  title: string;
  color: string;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface ProductFacets {
  brands: FacetValue[];
  colors: FacetValue[];
}
