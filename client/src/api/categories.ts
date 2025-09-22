import { apiRequest } from './client';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  partsCount?: number;
}

export async function fetchCategories(token: string | null, search?: string) {
  const params = new URLSearchParams();
  params.set('includeStats', 'true');
  if (search) {
    params.set('search', search);
  }

  return apiRequest<{ items: Category[] }>(`/api/categories?${params.toString()}`, {
    token,
  });
}

export async function fetchCategory(token: string | null, categoryId: string) {
  return apiRequest<{ category: Category; parts: unknown[] }>(`/api/categories/${categoryId}`, {
    token,
  });
}

export async function createCategory(
  token: string,
  payload: { name: string; description?: string }
) {
  return apiRequest<{ category: Category }>(`/api/categories`, {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function updateCategory(
  token: string,
  categoryId: string,
  payload: { name?: string; description?: string | null }
) {
  return apiRequest<{ category: Category }>(`/api/categories/${categoryId}`, {
    method: 'PATCH',
    token,
    body: payload,
  });
}

export async function deleteCategory(token: string, categoryId: string) {
  return apiRequest<void>(`/api/categories/${categoryId}`, {
    method: 'DELETE',
    token,
  });
}
