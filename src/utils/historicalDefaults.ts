// --- file: src/utils/historicalDefaults.ts
import type { Scenario } from "../types/scenario";
import type { ForecastParams } from "../types/params";
import { DEFAULT_MODEL_PARAMS } from "./defaults";

/**
 * safe number
 */
const n = (v: any, fb = 0) => (v === null || v === undefined || Number.isNaN(Number(v)) ? fb : Number(v));

/**
 * arithmetic mean of an array (returns null if empty)
 */
function mean(arr: number[]): number | null {
  if (!arr || arr.length === 0) return null;
  const s = arr.reduce((a, b) => a + b, 0);
  return s / arr.length;
}

/**
 * computeGeometricMeanGrowth(revenuesYears)
 * returns multiplier (e.g. 1.05 for +5% average annual growth)
 * expects revenues array ordered by time ascending (older -> newer)
 * returns null if not enough data (less than 2 points)
 */
function computeGeometricMeanGrowth(revenues: number[]): number | null {
  if (!revenues || revenues.length < 2) return null;
  const rates: number[] = [];
  for (let i = 1; i < revenues.length; i++) {
    const prev = revenues[i - 1];
    const cur = revenues[i];
    if (prev === 0) continue;
    rates.push(cur / prev);
  }
  if (rates.length === 0) return null;
  // geometric mean of rates
  const logSum = rates.reduce((s, r) => s + Math.log(r), 0);
  const gm = Math.exp(logSum / rates.length);
  return gm;
}

/**
 * computeHistoricalAverages
 * - scenario: full scenario (history + maybe forecasts)
 * - histYears: array of year strings to use (should be historical years only, oldest->newest)
 * - returns Partial<ForecastParams> with values in 0..1 (and revenueGrowthMultiplier as multiplier)
 *
 * Logic:
 * - cogsPct, sgnaPct, capexPct, receivablesPct, inventoryPct, payablesPct:
 *      mean of (line / revenues) across histYears where both exist and revenues > 0
 * - deprOnPpePct:
 *      mean of (depr_this_year / ppe_prev_year) across consecutive year pairs (so needs at least 2 years)
 * - deprPct: mean of (depr / revenues) fallback
 * - interestRate: mean of (financial_expense_this_year / prev_net_debt) across year pairs where prev_net_debt != 0
 * - finExpPct fallback: mean(financial_expense / revenues)
 * - revenueGrowthMultiplier: geometric mean of year-over-year revenues ratios
 *
 * Additional: compute receivablesDays/inventoryDays/payablesDays (DSO/DIO/DPO)
 */
export function computeHistoricalAverages(scenario: Scenario, histYears: string[]): Partial<ForecastParams> {
  const out: Partial<ForecastParams> = {};

  if (!histYears || histYears.length === 0) {
    // return defaults
    return { ...DEFAULT_MODEL_PARAMS };
  }

  // collect arrays
  const revenuesArr: number[] = [];
  const cogsRatios: number[] = [];
  const sgnaRatios: number[] = [];
  const capexRatios: number[] = [];
  const receivablesRatios: number[] = [];
  const inventoryRatios: number[] = [];
  const payablesRatios: number[] = [];
  const deprOnPpeRatios: number[] = []; // depr / prevPPE
  const deprOverRev: number[] = [];
  const finExpOverPrevDebt: number[] = [];
  const finExpOverRev: number[] = [];

  // days arrays
  const receivablesDaysArr: number[] = [];
  const inventoryDaysArr: number[] = [];
  const payablesDaysArr: number[] = [];

  // iterate years in ascending order (assume histYears already sorted oldest->newest)
  for (let i = 0; i < histYears.length; i++) {
    const y = histYears[i];
    const s = scenario[y];
    if (!s) continue;
    const inputs = s.inputs ?? {};
    const outputs = s.outputs ?? {};

    const revenues = n(inputs.revenues ?? outputs.revenues ?? null, NaN);
    if (!Number.isFinite(revenues)) {
      // skip ratios that need revenues
    } else {
      revenuesArr.push(revenues);

      const cogs = n(inputs.cogs ?? null, NaN);
      if (Number.isFinite(cogs)) cogsRatios.push(cogs / revenues);

      const sgna = n(inputs.sgna ?? null, NaN);
      if (Number.isFinite(sgna)) sgnaRatios.push(sgna / revenues);

      const capex = n(inputs.capex ?? null, NaN);
      if (Number.isFinite(capex)) capexRatios.push(capex / revenues);

      const receiv = n(inputs.receivables ?? null, NaN);
      if (Number.isFinite(receiv)) receivablesRatios.push(receiv / revenues);

      const inv = n(inputs.inventory ?? null, NaN);
      if (Number.isFinite(inv)) inventoryRatios.push(inv / revenues);

      const pay = n(inputs.payables ?? null, NaN);
      if (Number.isFinite(pay)) payablesRatios.push(pay / revenues);

      const finExp = n(inputs.financial_expense ?? null, NaN);
      if (Number.isFinite(finExp)) finExpOverRev.push(finExp / revenues);

      const depr = n(inputs.depr ?? null, NaN);
      if (Number.isFinite(depr)) deprOverRev.push(depr / revenues);

      // compute per-year DSO where possible
      if (revenues !== 0 && Number.isFinite(receiv)) {
        const dso = (receiv * 365) / revenues;
        receivablesDaysArr.push(dso);
      }

      // compute per-year DIO/DPO if COGS present
      if (Number.isFinite(cogs) && cogs !== 0) {
        if (Number.isFinite(inv)) {
          const dio = (inv * 365) / cogs;
          inventoryDaysArr.push(dio);
        }
        if (Number.isFinite(pay)) {
          const dpo = (pay * 365) / cogs;
          payablesDaysArr.push(dpo);
        }
      }
    }

    // deprOnPpe and interestRate require prev-year values => handle in next loop
  }

  // pairwise loop for deprOnPpe and interest rate (needs prev year)
  for (let i = 1; i < histYears.length; i++) {
    const y = histYears[i];
    const prev = histYears[i - 1];
    const s = scenario[y];
    const sp = scenario[prev];
    if (!s || !sp) continue;
    const inputs = s.inputs ?? {};
    const prevInputs = sp.inputs ?? {};

    const depr = n(inputs.depr ?? null, NaN);
    const prevPPE = n(prevInputs.ppe ?? null, NaN);
    if (Number.isFinite(depr) && Number.isFinite(prevPPE) && prevPPE !== 0) {
      deprOnPpeRatios.push(depr / prevPPE);
    }

    const finExp = n(inputs.financial_expense ?? null, NaN);
    const prevNetDebt = n(prevInputs.net_debt ?? prevInputs.debt ?? null, NaN);
    if (Number.isFinite(finExp) && Number.isFinite(prevNetDebt) && prevNetDebt !== 0) {
      finExpOverPrevDebt.push(finExp / prevNetDebt);
    }
  }

  // compute means with fallbacks to DEFAULT_MODEL_PARAMS if null
  const cogsPct = mean(cogsRatios) ?? DEFAULT_MODEL_PARAMS.cogsPct;
  const sgnaPct = mean(sgnaRatios) ?? DEFAULT_MODEL_PARAMS.sgnaPct;
  const capexPct = mean(capexRatios) ?? DEFAULT_MODEL_PARAMS.capexPct;

  const receivablesPct = mean(receivablesRatios) ?? DEFAULT_MODEL_PARAMS.receivablesPct;
  const inventoryPct = mean(inventoryRatios) ?? DEFAULT_MODEL_PARAMS.inventoryPct;
  const payablesPct = mean(payablesRatios) ?? DEFAULT_MODEL_PARAMS.payablesPct;

  const deprOnPpePct = mean(deprOnPpeRatios) ?? null;
  const deprPct = mean(deprOverRev) ?? DEFAULT_MODEL_PARAMS.deprPct;

  const interestRate = mean(finExpOverPrevDebt) ?? null;
  const finExpPct = mean(finExpOverRev) ?? DEFAULT_MODEL_PARAMS.finExpPct;

  const revenueGrowthMultiplier = computeGeometricMeanGrowth(revenuesArr) ?? DEFAULT_MODEL_PARAMS.revenueGrowthMultiplier;

  // compute mean days and provide fallbacks (pct->days)
  const meanReceivablesDays = mean(receivablesDaysArr);
  const meanInventoryDays = mean(inventoryDaysArr);
  const meanPayablesDays = mean(payablesDaysArr);

  const defaultReceivablesDays = (DEFAULT_MODEL_PARAMS.receivablesPct ?? 0) * 365;
  const defaultInventoryDays = (DEFAULT_MODEL_PARAMS.inventoryPct ?? 0) * 365;
  const defaultPayablesDays = (DEFAULT_MODEL_PARAMS.payablesPct ?? 0) * 365;

  function clampDays(d: any) {
    const num = Number(d ?? 0);
    if (!Number.isFinite(num)) return 0;
    return Math.min(Math.max(num, 0), 365 * 5);
  }

  // assemble output
  out.cogsPct = clamp01(cogsPct);
  out.sgnaPct = clamp01(sgnaPct);
  out.capexPct = clamp01(capexPct);

  if (deprOnPpePct !== null) out.deprOnPpePct = clamp01(deprOnPpePct);
  else out.deprOnPpePct = DEFAULT_MODEL_PARAMS.deprOnPpePct;

  out.deprPct = clamp01(deprPct);

  if (interestRate !== null) out.interestRate = clamp01(interestRate);
  else out.interestRate = DEFAULT_MODEL_PARAMS.interestRate;

  out.finExpPct = clamp01(finExpPct);

  // keep pct fallbacks for backward compatibility
  out.receivablesPct = clamp01(receivablesPct);
  out.inventoryPct = clamp01(inventoryPct);
  out.payablesPct = clamp01(payablesPct);

  // provide day-based defaults
  out.receivablesDays = clampDays(meanReceivablesDays ?? defaultReceivablesDays);
  out.inventoryDays = clampDays(meanInventoryDays ?? defaultInventoryDays);
  out.payablesDays = clampDays(meanPayablesDays ?? defaultPayablesDays);

  out.netDebtPct = DEFAULT_MODEL_PARAMS.netDebtPct; // we leave netDebtPct fallback untouched
  out.balanceGrowthPct = DEFAULT_MODEL_PARAMS.balanceGrowthPct;
  out.taxRate = DEFAULT_MODEL_PARAMS.taxRate;

  out.revenueGrowthMultiplier = revenueGrowthMultiplier;

  return out;
}

/** helper: clamp to 0..1 */
function clamp01(v: any) {
  const num = Number(v ?? 0);
  if (!Number.isFinite(num)) return 0;
  return Math.min(Math.max(num, 0), 1);
}
