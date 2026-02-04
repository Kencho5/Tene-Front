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
  brand: string;
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
