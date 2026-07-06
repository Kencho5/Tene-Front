export interface ProductFormData {
  id: string;
  name: string;
  description: string;
  price: number;
  discount: number;
  discounted_price: number;
  brand_id: number | null;
  cable_type_id: number | null;
  warranty: string;
  meta_title: string;
  meta_description: string;
  slug: string;
  no_index: boolean;
}

export interface ProductSeoFaqInput {
  question: string;
  answer: string;
}

export interface CreateProductPayload {
  id: string;
  name: string;
  description: string;
  price: number;
  discount?: number;
  discounted_price?: number;
  specifications: Record<string, Array<{ name: string; value: string }>>;
  videos?: string[];
  brand_id: number | null;
  cable_type_id: number | null;
  warranty: string;
  seo?: {
    meta_title: string | null;
    meta_description: string | null;
    meta_keywords: string[];
    slug: string | null;
    search_terms: string[];
    faqs: ProductSeoFaqInput[];
    no_index: boolean;
  };
}

export interface ImageUploadRequest {
  color: string;
  is_primary: boolean;
  content_type: string;
  quantity: number;
}

export interface PresignedUrlResponse {
  images: Array<{
    image_uuid: string;
    upload_url: string;
    public_url: string;
  }>;
}
