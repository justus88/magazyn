import { apiRequest } from './client';
import type { Part } from './parts';

export type MovementType = 'DELIVERY' | 'USAGE' | 'ADJUSTMENT';

export interface Movement {
  id: string;
  movementType: MovementType;
  quantity: number;
  movementDate: string;
  deliveryDate?: string | null;
  usageDate?: string | null;
  referenceCode?: string | null;
  notes?: string | null;
  part: Pick<Part, 'id' | 'name' | 'catalogNumber'> | null;
  performedBy: {
    id: string;
    email: string;
    role: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface MovementsResponse {
  items: Movement[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
  };
}

export async function fetchMovements(
  token: string,
  params: {
    partId?: string;
    movementType?: MovementType;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const query = new URLSearchParams();
  if (params.partId) query.set('partId', params.partId);
  if (params.movementType) query.set('movementType', params.movementType);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));

  return apiRequest<MovementsResponse>(`/api/movements?${query.toString()}`, {
    token,
  });
}

export async function createMovement(
  token: string,
  payload: {
    partId: string;
    movementType: MovementType;
    quantity: number;
    movementDate?: string;
    deliveryDate?: string;
    usageDate?: string;
    referenceCode?: string;
    notes?: string;
  },
) {
  return apiRequest<{ movement: Movement; partCurrentQuantity: number }>(`/api/movements`, {
    method: 'POST',
    token,
    body: payload,
  });
}
