export interface ProductFormData {
  id: number;
  name: string;
  description: string;
  price: number;
  discount: number;
  quantity: number;
  brand: string;
  warranty: string;
}

export interface CreateProductPayload {
  id: number;
  name: string;
  description: string;
  price: number;
  discount: number;
  quantity: number;
  specifications: Record<string, string>;
  brand: string;
  warranty: string;
}

export interface ImageUploadRequest {
  color: string;
  is_primary: boolean;
  content_type: string;
}

export interface PresignedUrlResponse {
  images: Array<{
    image_uuid: string;
    upload_url: string;
    public_url: string;
  }>;
}
