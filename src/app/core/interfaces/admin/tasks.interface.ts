export type TaskState = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskMediaType = 'image' | 'video' | 'audio';

export interface TaskMedia {
  media_uuid: string;
  media_type: TaskMediaType;
  url: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  state: TaskState;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
  media: TaskMedia[];
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  limit: number;
  offset: number;
}

export interface TaskCreatePayload {
  title: string;
  description?: string | null;
  state?: TaskState | null;
  priority?: TaskPriority | null;
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string;
  state?: TaskState;
  priority?: TaskPriority;
}

export interface TaskMediaUploadItem {
  media_type: TaskMediaType;
  content_type: string;
}

export interface TaskMediaPresignedResponse {
  media: Array<{
    media_uuid: string;
    media_type: TaskMediaType;
    upload_url: string;
    public_url: string;
  }>;
}

export interface TaskListParams {
  state?: TaskState;
  priority?: TaskPriority;
  limit?: number;
  offset?: number;
}
