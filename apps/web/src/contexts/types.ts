// Shared types for organization context and related components

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  settings?: OrganizationSettings;
}

export interface OrganizationSettings {
  allowPublicAccess?: boolean;
  defaultRole?: string;
  features?: string[];
}

export interface User extends BaseEntity {
  email: string;
  name: string;
  role: string;
  organizationId: string;
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface OrganizationMember extends BaseEntity {
  userId: string;
  organizationId: string;
  role: OrgRole;
  invitedBy?: string;
  invitedAt?: string;
  joinedAt?: string;
  user?: User;
}