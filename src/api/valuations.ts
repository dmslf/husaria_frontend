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
// frontend/src/api/valuations.ts

const IS_DEV = import.meta.env.DEV === true;
const RAW_BASE = IS_DEV ? '' : (import.meta.env.VITE_API_BASE_URL ?? '');
// ujednolicenie: usuń końcowe slashe
const NORMALIZED_BASE = RAW_BASE.replace(/\/+$/, '');
// jeśli produkcja i nie ustawiono BASE -> domyślny prefix (serwer Django analizuje /valuations/api/...)
const API_PREFIX = IS_DEV ? '' : (NORMALIZED_BASE || '/valuations');

export async function getCompanies(): Promise<CompanyDto[]> {
  const url = IS_DEV ? `/valuations/api/companies/` : `${API_PREFIX}/api/companies/`;
  return apiFetch<CompanyListResponse>(url).then(res => res.companies ?? []);
}

export async function getCompanyStatements(symbol: string): Promise<CompanyStatementsResponse> {
  const encoded = encodeURIComponent(symbol);
  const url = IS_DEV ? `/valuations/api/company/${encoded}/statements/` : `${API_PREFIX}/api/company/${encoded}/statements/`;
  return apiFetch<CompanyStatementsResponse>(url);
}

