import { getApiBaseUrl } from './client';

export interface AlstomSummary {
  totalFileItems: number;
  totalSystemItems: number;
  missingCount: number;
  extraCount: number;
  quantityMismatchCount: number;
  unitMismatchCount: number;
  nameMismatchCount: number;
}

export interface MissingItem {
  catalogNumber: string;
  name: string | null;
  unit: string | null;
  quantity: number;
}

export interface ExtraItem {
  catalogNumber: string;
  name: string | null;
  unit: string | null;
  quantity: number;
}

export interface QuantityDifference {
  partId: string;
  catalogNumber: string;
  name: string | null;
  unit: string | null;
  systemQuantity: number;
  fileQuantity: number;
  difference: number;
}

export interface UnitMismatch {
  catalogNumber: string;
  systemUnit: string | null;
  fileUnit: string | null;
}

export interface NameMismatch {
  catalogNumber: string;
  systemName: string | null;
  fileName: string | null;
}

export interface AlstomComparisonResponse {
  summary: AlstomSummary;
  missingInSystem: MissingItem[];
  extraInSystem: ExtraItem[];
  quantityDifferences: QuantityDifference[];
  unitMismatches: UnitMismatch[];
  nameDifferences: NameMismatch[];
}

export async function uploadAlstomComparison(token: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${getApiBaseUrl()}/api/imports/alstom`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? `Błąd importu (status ${response.status})`);
  }

  const data = (await response.json()) as AlstomComparisonResponse;
  return data;
}

export interface ApplyAdjustmentRequest {
  partId: string;
  catalogNumber: string;
  fileQuantity: number;
}

export interface ApplyAdjustmentResult {
  partId: string;
  catalogNumber: string;
  name: string | null;
  previousQuantity: number;
  newQuantity: number;
  difference: number;
  movementId: string;
}

export interface AdjustmentIssue {
  partId: string | null;
  catalogNumber: string;
  name: string | null;
  reason: string;
}

export interface ApplyAlstomAdjustmentsResponse {
  applied: ApplyAdjustmentResult[];
  skipped: AdjustmentIssue[];
  failed: AdjustmentIssue[];
}

export async function applyAlstomAdjustments(
  token: string,
  adjustments: ApplyAdjustmentRequest[],
) {
  if (adjustments.length === 0) {
    throw new Error('Brak zaznaczonych pozycji do aktualizacji.');
  }

  const response = await fetch(`${getApiBaseUrl()}/api/imports/alstom/apply`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ adjustments }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? `Błąd zapisu zmian (status ${response.status})`);
  }

  const data = (await response.json()) as ApplyAlstomAdjustmentsResponse;
  return data;
}
