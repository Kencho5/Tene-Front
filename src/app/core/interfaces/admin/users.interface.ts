export type UserRole = 'user' | 'admin';

export interface UserQuery {
  id?: number;
  email?: string;
  limit?: number;
  offset?: number;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface UserSearchResponse {
  users: UserResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserRequest {
  email?: string;
  name?: string;
  role?: UserRole;
}
