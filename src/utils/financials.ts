// src/utils/financials.ts
export type NetDebtArgs = {
  prevDebt?: number | null;
  prevCash?: number | null;
  revenues: number;
  balanceGrowthPct?: number; // e.g. 0.02
  netDebtPctFallback?: number; // e.g. 0.2
};

/** Bezpieczna konwersja na number z fallbackiem */
export function safeNum(v: any, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Prosty, testowalny calcNetDebt:
 * - jeśli znamy prevDebt i prevCash => debt - cash*(1+growth)
 * - w przeciwnym razie fallback = revenues * netDebtPctFallback
 */
export function calcNetDebt({
  prevDebt,
  prevCash,
  revenues,
  balanceGrowthPct = 0.02,
  netDebtPctFallback = 0.2,
}: NetDebtArgs): number {
  const hasDebt = prevDebt !== null && prevDebt !== undefined;
  const hasCash = prevCash !== null && prevCash !== undefined;

  if (hasDebt && hasCash) {
    const debt = safeNum(prevDebt, 0);
    const cash = safeNum(prevCash, 0) * (1 + (balanceGrowthPct ?? 0));
    return debt - cash;
  }

  return revenues * (netDebtPctFallback ?? 0);
}

/** Prosty next PPE */
export function nextPPE(prevPPE: any, capex: any, depr: any) {
  return safeNum(prevPPE, 0) + safeNum(capex, 0) - safeNum(depr, 0);
}
