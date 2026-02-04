export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  description: string | null;
  display_order: number;
  enabled: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryTreeNode {
  id: number;
  name: string;
  slug: string;
  image_url?: string | null;
  children: CategoryTreeNode[];
}

export interface CategoryTreeResponse {
  categories: CategoryTreeNode[];
}

export interface CategoryRequest {
  name: string;
  slug: string;
  parent_id?: number | null;
  description?: string;
  display_order?: number;
  enabled?: boolean;
}

export interface CategoryResponse extends Category {}

export interface CategorySearchResponse {
  categories: Category[];
  total: number;
  limit: number;
  offset: number;
}

export interface CategoryImageUploadRequest {
  content_type: string;
}

export interface CategoryImagePresignedResponse {
  image_uuid: string;
  upload_url: string;
  public_url: string;
}
