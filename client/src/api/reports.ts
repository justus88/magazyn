import { apiRequestBinary } from './client';

export async function downloadInventoryReport(token: string) {
  return apiRequestBinary('/api/reports/inventory', {
    method: 'GET',
    token,
  });
}
