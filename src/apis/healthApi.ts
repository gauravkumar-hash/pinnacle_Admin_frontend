import { ENV } from "@/utils/env";


export const fetchPatients = async () => {
  const response = await fetch(`${ENV.API_BASE_URL}/admin/patients/list`); // Adjust endpoint as needed
  if (!response.ok) throw new Error('Failed to fetch patients');
  return response.json();
};

export const exportHealthReport = async (nrics: string[]): Promise<Blob> => {
  const response = await fetch(`${ENV.API_BASE_URL}/admin/health-report/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nrics),
  });
  if (!response.ok) throw new Error('Export failed');
  return response.blob();
};