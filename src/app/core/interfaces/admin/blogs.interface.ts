export type BlogStatus = 'draft' | 'published';
export type BlogMediaType = 'image' | 'video';

export interface BlogMedia {
  media_uuid: string;
  media_type: BlogMediaType;
  is_thumbnail: boolean;
  url: string;
}

export interface BlogWithMedia {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: BlogStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  thumbnail: BlogMedia | null;
  media: BlogMedia[];
}

export interface BlogListResponse {
  blogs: BlogWithMedia[];
  total: number;
  limit: number;
  offset: number;
}

export interface BlogCreatePayload {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  status?: BlogStatus;
}

export interface BlogUpdatePayload {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  status?: BlogStatus;
}

export interface BlogMediaUploadItem {
  media_type: BlogMediaType;
  content_type: string;
  is_thumbnail?: boolean;
}

export interface BlogMediaPresignedResponse {
  media: Array<{
    media_uuid: string;
    media_type: BlogMediaType;
    is_thumbnail: boolean;
    upload_url: string;
    public_url: string;
  }>;
}

export interface BlogListParams {
  status?: BlogStatus;
  limit?: number;
  offset?: number;
}
