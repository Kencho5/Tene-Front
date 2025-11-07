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
  user_id: number;
  email: string;
  name: string;
  exp: number;
}
