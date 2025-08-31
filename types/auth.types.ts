// types/auth.types.ts
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  phone_number: string;
  age: number;
}

export interface LoginResponse {
  data: {
    access_token: string;
    refresh_token: string;
    tokenType: string;
  };
}

export interface refreshTokenResponse {
  access_token: string;
  refresh_token: string;
  tokenType: string;
}

export interface User {
  id?: string;
  username: string;
  email?: string;
  phone_number?: string;
  age?: number;
}

export interface TokenPayload {
  sub: string;
  exp: number;
  iat: number;
  // Add other JWT payload fields as needed
}

export interface AuthContextType {
  user: User | null;
  access_token: string | null;
  refresh_token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshaccess_token: () => Promise<string | null>;
}
