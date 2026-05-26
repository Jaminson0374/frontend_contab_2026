export type UserRole = 'ADMIN' | 'CAJERO' | 'CARNICERO' | 'AUXILIAR' | 'CONTADOR';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  email?: string;
  isActive?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  role: UserRole;
  userId: string;
  fullName: string;
}

export interface UserRequest {
  username: string;
  fullName: string;
  email: string;
  roleId: string;
  isActive: boolean;
}

export interface UserResponse {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: RoleSummary;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tempPassword?: string;
}

export interface RoleSummary {
  id: string;
  name: string;
}

export interface RoleResponse {
  id: string;
  name: string;
  permissions: string;
  createdAt: string;
}
