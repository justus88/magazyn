export interface AuthUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER';
  isActive: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}
