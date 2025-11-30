// src/types/params.ts

/**
 * GlobalParams
 * - revenueGrowthMultiplier: stored as multiplier (e.g. 1.05 => +5%)
 * - forecastYears: integer (1..n)
 * - historicalYears: how many past years to show / use for defaults
 */
export interface GlobalParams {
  // growth shown in UI as e.g. 5 => 5% (stored as multiplier: 1.05)
  revenueGrowthMultiplier?: number; // stored as multiplier, e.g. 1.05

  // ile lat prognozy (liczba całkowita)
  forecastYears?: number;

  // ile ostatnich lat historycznych wyświetlić / użyć do obliczeń
  historicalYears?: number;
}

/**
 * ForecastParams
 *
 * Wszystkie wartości procentowe są przechowywane jako ułamek 0..1
 * (np. 0.6 = 60%).
 *
 * Zasada: preferujemy formuły bez cykli:
 * - cogs/sgna/capex = % * revenues_t
 * - depr = % * PPE_{t-1}  (deprOnPpePct)
 * - financial_expense = prev_net_debt * interestRate
 *
 * Uwaga: deprPct oraz finExpPct pozostawione są jako OPTIONAL
 * (fallbacky / backward compatibility) — preferuj deprOnPpePct i interestRate.
 *
 * Dodatkowo: working capital można zadeklarować jako:
 *  - procenty względem revenues (receivablesPct, inventoryPct, payablesPct) — historyczny fallback,
 *  - LUB jako dni (receivablesDays / inventoryDays / payablesDays) — bardziej intuicyjne:
 *      receivables = (DSO * revenues) / 365
 *      inventory  = (DIO * COGS) / 365
 *      payables   = (DPO * COGS) / 365
 *
 * W implementacji preferuj dni (jeśli podane), w przeciwnym razie fallbackuj na pct -> days (pct * 365).
 */
export interface ForecastParams {
  // --- global / growth ---
  // If you prefer to edit growth as percent in UI, convert 5% -> 1.05 before storing
  revenueGrowthMultiplier?: number; // multiplier e.g. 1.05

  // ile lat prognozy (1..7 typically)
  forecastYears?: number;

  // --- IS: percentages of revenues (0..1) ---
  cogsPct?: number;   // COGS as % of revenues
  sgnaPct?: number;   // SG&A as % of revenues

  /**
   * Deprecation note:
   * - deprOnPpePct: preferred — amortyzacja = deprOnPpePct * PPE_{t-1}
   * - deprPct: legacy/fallback — amortyzacja = deprPct * revenues_t (if deprOnPpePct missing)
   */
  deprOnPpePct?: number; // preferred: depreciation as % of previous PPE (0..1)
  deprPct?: number | undefined; // legacy fallback: depreciation as % of revenues (0..1)

  /**
   * Financial expense:
   * - preferred: compute from prev net debt * interestRate
   * - finExpPct left for backward compatibility (finExpPct * revenues)
   */
  interestRate?: number; // annual interest rate used to compute financial_expense from prev net debt (0..1)
  finExpPct?: number | undefined; // legacy fallback: financial expense as % of revenues (0..1)

  // --- CAPEX ---
  capexPct?: number;   // capex as % of revenues (0..1)

  // --- Working capital (two possible representations) ---
  // Option A: percent-of-revenues (legacy / simple)
  receivablesPct?: number; // receivables / revenues (0..1)
  inventoryPct?: number;   // inventory / revenues (0..1) — kept for backward compat
  payablesPct?: number;    // payables / revenues (0..1)

  // Option B (preferred): days-based (DSO / DIO / DPO)
  // Units: number of days (e.g. 45)
  // - receivablesDays (DSO): receivables = receivablesDays * revenues / 365
  // - inventoryDays  (DIO):   inventory  = inventoryDays  * COGS / 365
  // - payablesDays   (DPO):   payables   = payablesDays   * COGS / 365
  receivablesDays?: number;
  inventoryDays?: number;
  payablesDays?: number;

  // --- Balance / debt modeling ---
  netDebtPct?: number; // target net debt as % of revenues fallback (0..1 or >1 if needed)
  balanceGrowthPct?: number; // how non-modeled balance sheet items grow per year (0..1)

  // --- Tax ---
  taxRate?: number; // 0..1

  // --- Optional: UI-only / meta flags (not required) ---
  // e.g. useDeprMode: "onPPE" | "onRevenue" to let user switch depr formula
  useDeprMode?: "onPPE" | "onRevenue";
}

/**
 * ModelParams = Global + Forecast (convenience)
 */
export type ModelParams = GlobalParams & ForecastParams;

/**
 * DCF params used by DCF calculator
 */
export interface DcfParams {
  wacc: number; // e.g. 0.09 for 9%
  perpetualGrowth: number; // e.g. 0.02 for 2%
  // optional override for taxRate; if not provided, use forecastParams.taxRate
  taxRate?: number;
}
