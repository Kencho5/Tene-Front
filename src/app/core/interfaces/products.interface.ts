export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
}

export interface ProductFaq {
  question: string;
  answer: string;
}

export interface ProductSeo {
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string[] | null;
  slug: string | null;
  search_terms: string[] | null;
  faqs: ProductFaq[] | null;
  og_image_uuid: string | null;
  no_index: boolean | null;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount: number;
  quantity: number;
  specifications: Record<string, Array<{ name: string; value: string }>>;
  warranty: string;
  brand_id: number;
  brand_name: string;
  cable_type_id: number | null;
  enabled: boolean;
  categories: ProductCategory[];
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  product_id: string;
  image_uuid: string;
  color: string;
  is_primary: boolean;
  extension: string;
  quantity: number;
}

export interface ProductResponse {
  data: Product;
  images: ProductImage[];
  categories: ProductCategory[];
  seo?: ProductSeo | null;
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
  selectedImageQuantity: number;
  cableConfig?: {
    variantId: number;
    cableTypeId: number;
    watts: number;
    lengthCm: number;
    price: number;
    warranty: string;
  };
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
  phone_number: string;
  address: string;
  guest_city: string;
  guest_region: string;
  guest_address: string;
  guest_details: string;
  delivery_type: string;
  delivery_time: string;
  comment: string;
}

export interface ProductCategoryCard {
  text: string;
  image: string;
  route: string;
  categoryId?: number;
  color?: string;
}

export interface CheckoutRequest {
  customer_type: string;
  name?: string;
  surname?: string;
  organization_type?: string;
  organization_name?: string;
  organization_code?: string;
  email: string;
  phone_number: string;
  address: string;
  city: string;
  region?: string;
  details: string;
  delivery_type: string;
  delivery_time: string;
  comment?: string;
  comment_image_uuids?: string[];
  items: {
    product_id: string;
    quantity: number;
    color: string;
    cable_config?: { watts: number; length_cm: number };
  }[];
}

export interface CheckoutResponse {
  order_id: string;
  checkout_url: string;
}

export interface CommentImageUploadItem {
  content_type: string;
}

export interface CommentImagePresignedResponse {
  images: Array<{
    image_uuid: string;
    upload_url: string;
    public_url: string;
  }>;
}

export type OrderStatus =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'expired'
  | 'processing'
  | 'prepared'
  | 'shipped'
  | 'finance_cleared';

export interface Order {
  id: number;
  user_id: number;
  order_id: string;
  status: OrderStatus;
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
  city: string;
  details: string;
  comment: string | null;
  comment_images?: OrderCommentImage[];
  delivery_type: string;
  delivery_time: string;
  checkout_url: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface OrderCommentImage {
  image_uuid: string;
  url: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  product_name: string;
  product_image: ProductImage | null;
  created_at: string;
  cable_config?: { watts: number; length_cm: number } | null;
}

export interface OrderSearchResponse {
  orders: Order[];
  total: number;
  total_amount: number;
  limit: number;
  offset: number;
}

export interface ProductBrandCard {
  brand: string;
  brandId: number;
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
  parent_id: number | null;
  name: string;
  count: number;
}

export interface ProductFacets {
  brands: BrandFacet[];
  colors: FacetValue[];
  categories: CategoryFacet[];
}
