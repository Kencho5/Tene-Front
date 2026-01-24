export interface RegisterFields {
  email: string;
  name: string;
  password: string;
}

export interface LoginFields {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}

export interface User {
  sub: string;
  user_id: number;
  email: string;
  name: string;
  role: 'user' | 'admin';
  exp: number;
}
