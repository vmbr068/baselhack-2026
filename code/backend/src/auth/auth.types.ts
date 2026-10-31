export type UserRole = 'business_owner' | 'admin';

export interface BusinessUser {
  id: string;
  email: string;
  fullName: string;
  company: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: BusinessUser;
  expiresAt: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: BusinessUser;
  message?: string;
}
