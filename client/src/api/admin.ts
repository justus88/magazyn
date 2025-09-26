import { apiRequest } from './client';

export interface AdminUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'SERWISANT';
  isActive: boolean;
  createdAt: string;
  approvedAt: string | null;
  approvedBy?: { id: string; email: string } | null;
}

interface AdminUsersResponse {
  items: AdminUser[];
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: AdminUser['role'];
  isActive?: boolean;
}

interface CreateUserResponse {
  user: AdminUser;
  message: string;
}

interface RegistrationSettingsResponse {
  allowSelfRegistration: boolean;
  message?: string;
}

export async function fetchUsers(token: string, status: 'pending' | 'active' | 'all' = 'pending') {
  const query = new URLSearchParams({ status });
  return apiRequest<AdminUsersResponse>(`/api/admin/users?${query.toString()}`, {
    token,
  });
}

export async function updateUserApproval(
  token: string,
  userId: string,
  approve: boolean,
) {
  return apiRequest<{ message: string }>(`/api/admin/users/${userId}/approval`, {
    method: 'PATCH',
    token,
    body: { approve },
  });
}

export async function deleteUser(token: string, userId: string) {
  return apiRequest<void>(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    token,
  });
}

export async function createUser(token: string, payload: CreateUserPayload) {
  return apiRequest<CreateUserResponse, CreateUserPayload>('/api/admin/users', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function fetchRegistrationSettings(token: string) {
  return apiRequest<RegistrationSettingsResponse>('/api/admin/settings/registration', {
    token,
  });
}

export async function updateRegistrationSettings(token: string, allowSelfRegistration: boolean) {
  return apiRequest<RegistrationSettingsResponse, { allowSelfRegistration: boolean }>(
    '/api/admin/settings/registration',
    {
      method: 'PATCH',
      token,
      body: { allowSelfRegistration },
    },
  );
}
