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
