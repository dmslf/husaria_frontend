// src/utils/format.ts
export function formatNumber(value: number, decimals = 0): string {
  if (!isFinite(value)) return '-';
  return value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
