import { apiRequest } from './client';

export interface AdminUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
  approvedAt: string | null;
  approvedBy?: { id: string; email: string } | null;
}

interface AdminUsersResponse {
  items: AdminUser[];
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
