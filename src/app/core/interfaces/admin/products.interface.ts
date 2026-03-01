export interface ProductFormData {
  id: number;
  name: string;
  description: string;
  price: number;
  discount: number;
  brand_id: number | null;
  warranty: string;
}

export interface CreateProductPayload {
  id: number;
  name: string;
  description: string;
  price: number;
  discount: number;
  specifications: Record<string, string>;
  brand_id: number | null;
  warranty: string;
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
