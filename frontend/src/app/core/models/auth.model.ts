export type UserRole = 'Admin' | 'Customer';

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
}

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  isActive?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  profile?: UserProfile | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginResponseItem {
  token: string;
  expiresAt: string;
  user: AuthUser;
}
