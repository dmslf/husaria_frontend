// frontend/src/api/valuations.ts
import { apiFetch } from './api';

export interface CompanyDto {
  symbol: string;
  name: string;
  exchange?: string;
  shares_outstanding?: number | null;
}

export interface CompanyListResponse {
  companies: CompanyDto[];
}

export interface CompanyStatementsResponse {
  symbol: string;
  name: string;
  statements: Record<string, Record<string, any>>;
}

// Jeśli jest tryb deva Vite — użyj względnych ścieżek żeby proxy zadziałało.
// W produkcji (build) użyj VITE_API_BASE_URL (wartości ustawionej podczas builda).
const IS_DEV = import.meta.env.DEV === true;
const BASE = IS_DEV ? '' : (import.meta.env.VITE_API_BASE_URL ?? ''); // w prod np. "http://.../valuations"

export async function getCompanies(): Promise<CompanyDto[]> {
  // dev: "/valuations/api/companies/" -> pójdzie przez proxy do Django
  // prod: "http://.../valuations/api/companies/"
  const url = IS_DEV ? `/valuations/api/companies/` : `${BASE}/api/companies/`;
  return apiFetch<CompanyListResponse>(url).then(res => res.companies ?? []);
}

export async function getCompanyStatements(symbol: string): Promise<CompanyStatementsResponse> {
  const encoded = encodeURIComponent(symbol);
  const url = IS_DEV ? `/valuations/api/company/${encoded}/statements/` : `${BASE}/api/company/${encoded}/statements/`;
  return apiFetch<CompanyStatementsResponse>(url);
}
