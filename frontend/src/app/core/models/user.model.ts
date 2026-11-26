import { UserProfile, UserRole } from './auth.model';

export interface ManagedUser {
  id: number;
  email: string;
  roleId: number;
  role: UserRole;
  isActive: boolean;
  profile: UserProfile | null;
  createdAt: string;
  updatedAt?: string;
}

export interface PaginatedUsersResponse {
  total: number;
  page: number;
  pageSize: number;
  users: ManagedUser[];
}

export interface AdminCreateUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: number;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  dateOfBirth?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
