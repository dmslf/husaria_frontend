// src/utils/defaults.ts

export const DEFAULT_MODEL_PARAMS = {
  //
  // GLOBAL / GROWTH
  //
  revenueGrowthMultiplier: 1.05,   // +5% rocznie
  forecastYears: 3,

  //
  // INCOME STATEMENT (% of revenues)
  //
  cogsPct: 0.60,                   // 60% przychodów
  sgnaPct: 0.15,                   // 15%
  capexPct: 0.05,                  // 5%

  //
  // DEPRECIATION
  //
  // preferowane podejście: % poprzedniego PPE
  deprOnPpePct: 0.08,              // 8% rocznie od PPE_prev

  // fallback / tryb alternatywny: amortyzacja jako % revenues
  deprPct: 0.05,                   // 5% przychodów (fallback, jeśli deprOnPpePct = 0)

  //
  // FINANCIAL EXPENSE
  //
  interestRate: 0.05,              // 5% od długu netto (preferred)
  finExpPct: 0.02,                 // fallback: 2% revenues

  //
  // WORKING CAPITAL (% of revenues)
  //
  receivablesPct: 0.10,            // 10% przychodów
  inventoryPct: 0.08,              // 8%
  payablesPct: 0.06,               // 6%

  //
  // DEBT & BALANCE SHEET
  //
  netDebtPct: 0.20,                // fallback net_debt = revenue * 20%
  balanceGrowthPct: 0.02,          // 2% rocznie

  //
  // TAX
  //
  taxRate: 0.19,                   // 19%


  // additional defaults (optional)
  receivablesDays: 0.10 * 365, // i.e. pct * 365
  inventoryDays: 0.08 * 365,
  payablesDays: 0.06 * 365,

} as const;
