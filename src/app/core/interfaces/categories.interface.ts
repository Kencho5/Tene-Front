export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  description: string | null;
  display_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryTreeNode {
  id: number;
  name: string;
  slug: string;
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

export interface CategoryResponse {
  data: Category;
}

export interface CategorySearchResponse {
  categories: Category[];
  total: number;
  limit: number;
  offset: number;
}
