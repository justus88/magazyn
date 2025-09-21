export interface Part {
  id: string;
  catalogNumber: string;
  name: string;
  category?: string;
  availableQuantity: number;
  unit?: string;
}

export interface PartsResponse {
  items: Part[];
  pagination?: {
    total: number;
  };
}
