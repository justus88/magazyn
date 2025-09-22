import { apiRequest } from './client';

export interface Part {
  id: string;
  catalogNumber: string;
  name: string;
  description: string | null;
  manufacturer: string | null;
  categoryId: string | null;
  category: string | null;
  unit: string | null;
  minimumQuantity: number | null;
  currentQuantity: number;
  storageLocation: string | null;
  barcode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartsListResponse {
  items: Part[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
}

export async function fetchParts(
  token: string | null,
  params: { search?: string; categoryId?: string; page?: number; pageSize?: number } = {}
) {
  const query = new URLSearchParams();
  if (params.search) {
    query.set('search', params.search);
  }
  if (params.categoryId) {
    query.set('categoryId', params.categoryId);
  }
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.pageSize) {
    query.set('pageSize', String(params.pageSize));
  }

  return apiRequest<PartsListResponse>(`/api/parts?${query.toString()}`, {
    token,
  });
}

export async function createPart(
  token: string,
  payload: {
    catalogNumber: string;
    name: string;
    description?: string | null;
    manufacturer?: string | null;
    categoryId?: string | null;
    unit?: string | null;
    minimumQuantity?: number | null;
    currentQuantity?: number | null;
    storageLocation?: string | null;
    barcode?: string | null;
  }
) {
  return apiRequest<{ part: Part }>(`/api/parts`, {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function updatePart(
  token: string,
  partId: string,
  payload: {
    catalogNumber?: string;
    name?: string;
    description?: string | null;
    manufacturer?: string | null;
    categoryId?: string | null;
    unit?: string | null;
    minimumQuantity?: number | null;
    currentQuantity?: number | null;
    storageLocation?: string | null;
    barcode?: string | null;
  }
) {
  return apiRequest<{ part: Part }>(`/api/parts/${partId}`, {
    method: 'PATCH',
    token,
    body: payload,
  });
}

export async function deletePart(token: string, partId: string) {
  return apiRequest<void>(`/api/parts/${partId}`, {
    method: 'DELETE',
    token,
  });
}
