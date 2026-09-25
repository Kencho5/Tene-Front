export type SliderImageVariant = 'desktop' | 'mobile';

export interface Slider {
  id: number;
  title: string | null;
  link_url: string | null;
  enabled: boolean;
  display_order: number;
  desktop_image_url: string | null;
  mobile_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SliderRequest {
  title: string | null;
  link_url: string | null;
  enabled: boolean;
}

export interface SliderImageUploadRequest {
  variant: SliderImageVariant;
  content_type: string;
}

export interface SliderImagePresignedResponse {
  image_uuid: string;
  upload_url: string;
  public_url: string;
}
