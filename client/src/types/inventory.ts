export interface Part {
  id: string;
  catalogNumber: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  category?: string | null;
  unit?: string | null;
  minimumQuantity?: number | null;
  currentQuantity: number;
  storageLocation?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PartsResponse {
  items: Part[];
  pagination?: {
    total: number;
    page?: number;
    pageSize?: number;
  };
}
