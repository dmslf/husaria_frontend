
// --- file: src/utils/scenarioBuilder.ts
import type { Scenario } from "../types/scenario";
import type { ModelParams } from "../types/params";
import { safeNum, calcNetDebt, nextPPE } from "./financials";
import { DEFAULT_MODEL_PARAMS } from "./defaults";

/**
 * Helper: try several candidate field names from API to map into our internal key
 */
function pickFirstDefined(obj: Record<string, any> | undefined, candidates: string[]) {
  if (!obj) return null;
  for (const c of candidates) {
    if (obj[c] !== undefined && obj[c] !== null) return obj[c];
  }
  return null;
}

/**
 * buildScenarioFromStatements
 * - spróbuje elastycznie zmapować różne warianty nazw z API na nasze internal keys
 */
export function buildScenarioFromStatements(apiStatements: Record<string, any>): Scenario {
  const scenario: Scenario = {};
  const years = Object.keys(apiStatements).sort((a, b) => Number(a) - Number(b));
  for (const year of years) {
    const stmt = apiStatements[year] ?? {};
    const inputs: Record<string, number | null> = {};

    // Income statement: we look for common names -- prefer canonical ones if present
    const isObj = stmt.IS ?? {};
    inputs.revenues = pickFirstDefined(isObj, ["revenues", "revenue", "sales"]);
    inputs.cogs = pickFirstDefined(isObj, ["cogs", "cost_of_goods_sold", "cost_of_sales"]);
    inputs.sgna = safeNum(isObj.sgna, 0) - safeNum(isObj.other_operating_income, 0) + safeNum(isObj.other_operating_expense, 0) + safeNum(isObj.selling_expenses, 0);
    inputs.financial_expense = safeNum(isObj.financial_expense, 0) - safeNum(isObj.financial_income, 0)
    inputs.net_income = pickFirstDefined(isObj, ["net_income", "netProfit", "net_profit", "profit_after_tax"]);
    inputs.ebit = pickFirstDefined(isObj, ["ebit", "operating_income"]);
    inputs.gross_profit = pickFirstDefined(isObj, ["gross_profit", "grossProfit"]);

    // Balance sheet: many naming variants for receivables/payables/inventory
    const bsObj = stmt.BS ?? {};
    inputs.cash = pickFirstDefined(bsObj, ["cash", "cash_and_equivalents", "cash_and_cash_equivalents"]);
    inputs.receivables = pickFirstDefined(bsObj, ["receivables", "accounts_receivable", "trade_receivables"]);
    inputs.inventory = pickFirstDefined(bsObj, ["inventory", "inventories", "stock"]);
    inputs.ppe = pickFirstDefined(bsObj, ["ppe", "property_plant_equipment", "fixed_assets"]);
    inputs.equity_parent = pickFirstDefined(bsObj, ["equity_parent", "equity", "total_equity"]);
    inputs.short_term_liabilities = pickFirstDefined(bsObj, ["short_term_liabilities", "current_liabilities"]);
    inputs.long_term_liabilities = pickFirstDefined(bsObj, ["long_term_liabilities", "non_current_liabilities"]);
    inputs.payables = pickFirstDefined(bsObj, ["short_term_trade_payables", "accounts_payable", "short_term_liabilities", "trade_payables"]);

    const short_term_loans = safeNum(bsObj.loans_short, 0);
    const long_term_loans = safeNum(bsObj.loans_long, 0);
    const short_term_lease = safeNum(bsObj.lease_liabilities_short, 0);
    const long_term_lease = safeNum(bsObj.lease_liabilities_long, 0);
    const short_term_bonds = safeNum(bsObj.debt_issuance_short, 0);
    const long_term_bonds = safeNum(bsObj.debt_issuance_long, 0);
    const debt = short_term_loans + long_term_loans + short_term_lease + long_term_lease + short_term_bonds + long_term_bonds
    inputs.debt = debt
    inputs.net_debt = debt - safeNum(bsObj.cash, 0)


    // Cash flow: try to pick capex/operating_cf from CF if present
    const cfObj = stmt.CF ?? {};
    inputs.operating_cf = pickFirstDefined(cfObj, ["operating_cf", "net_cash_from_operating_activities", "cash_from_operations"]);
    inputs.capex = pickFirstDefined(cfObj, ["capex", "capital_expenditures", "purchase_of_fixed_assets"]);
    inputs.depr = pickFirstDefined(cfObj, ["depr", "depreciation", "amortization"]);
    inputs.investing_cf = pickFirstDefined(cfObj, ["investing_cf", "net_cash_from_investing_activities"]);
    inputs.financing_cf = pickFirstDefined(cfObj, ["financing_cf", "net_cash_from_financing_activities"]);
    inputs.net_change_in_cash = pickFirstDefined(cfObj, ["net_change_in_cash", "change_in_cash"]);


    // fallback ensure numbers or null
    for (const k of Object.keys(inputs)) {
      inputs[k] = inputs[k] != null ? Number(inputs[k]) : null;
    }

    scenario[year] = {
      raw: { IS: stmt.IS ?? {}, BS: stmt.BS ?? {}, CF: stmt.CF ?? {} },
      inputs,
      outputs: {},
    };
  }
  return scenario;
}

/**
 * computeScenario
 * - populates outputs for historical years (including operating_cf & fcff if possible)
 * - and then produces forecast years using the established pipeline
 */
export function computeScenario(raw: Scenario, params?: ModelParams): Scenario {
  const defaults = DEFAULT_MODEL_PARAMS;

  // cfg in camelCase
  const cfg = {
    revenueGrowthMultiplier: params?.revenueGrowthMultiplier ?? defaults.revenueGrowthMultiplier,
    forecastYears: params?.forecastYears ?? defaults.forecastYears,

    cogsPct: params?.cogsPct ?? defaults.cogsPct,
    sgnaPct: params?.sgnaPct ?? defaults.sgnaPct,
    capexPct: params?.capexPct ?? defaults.capexPct,

    deprOnPpePct: params?.deprOnPpePct ?? defaults.deprOnPpePct,
    deprPct: params?.deprPct ?? defaults.deprPct,

    interestRate: params?.interestRate ?? defaults.interestRate,
    finExpPct: params?.finExpPct ?? defaults.finExpPct,

    receivablesPct: params?.receivablesPct ?? defaults.receivablesPct,
    inventoryPct: params?.inventoryPct ?? defaults.inventoryPct,
    payablesPct: params?.payablesPct ?? defaults.payablesPct,

    // new: days-based defaults (user can pass receivablesDays etc in params)
    receivablesDays: params?.receivablesDays ?? (defaults.receivablesPct * 365),
    inventoryDays: params?.inventoryDays ?? (defaults.inventoryPct * 365),
    payablesDays: params?.payablesDays ?? (defaults.payablesPct * 365),

    netDebtPct: params?.netDebtPct ?? defaults.netDebtPct,
    balanceGrowthPct: params?.balanceGrowthPct ?? defaults.balanceGrowthPct,

    taxRate: params?.taxRate ?? defaults.taxRate,
  } as any;

  // clamp and sanitize (same as before)
  cfg.revenueGrowthMultiplier = Math.min(Math.max(Number(cfg.revenueGrowthMultiplier), 0.5), 2.0);
  cfg.forecastYears = Math.min(Math.max(Math.round(Number(cfg.forecastYears)), 1), 10);
  const clamp01 = (v: any) => (Number.isFinite(Number(v)) ? Math.min(Math.max(Number(v), 0), 1) : 0);
  cfg.cogsPct = clamp01(cfg.cogsPct);
  cfg.sgnaPct = clamp01(cfg.sgnaPct);
  cfg.capexPct = clamp01(cfg.capexPct);
  cfg.deprOnPpePct = clamp01(cfg.deprOnPpePct);
  cfg.deprPct = clamp01(cfg.deprPct);
  cfg.interestRate = clamp01(cfg.interestRate);
  cfg.finExpPct = clamp01(cfg.finExpPct);
  cfg.receivablesPct = clamp01(cfg.receivablesPct);
  cfg.inventoryPct = clamp01(cfg.inventoryPct);
  cfg.payablesPct = clamp01(cfg.payablesPct);
  cfg.balanceGrowthPct = clamp01(cfg.balanceGrowthPct);
  cfg.taxRate = clamp01(cfg.taxRate);
  cfg.netDebtPct = Number.isFinite(Number(cfg.netDebtPct)) ? Math.min(Math.max(Number(cfg.netDebtPct), 0), 5) : 0;

  // clamp days to reasonable bounds
  function clampDays(v: any) {
    const num = Number(v ?? 0);
    if (!Number.isFinite(num)) return 0;
    return Math.min(Math.max(num, 0), 365 * 5);
  }
  cfg.receivablesDays = clampDays(cfg.receivablesDays);
  cfg.inventoryDays = clampDays(cfg.inventoryDays);
  cfg.payablesDays = clampDays(cfg.payablesDays);

  const computed: Scenario = {};
  const years = Object.keys(raw).sort((a, b) => Number(a) - Number(b));
  const historicalYears = years.slice(); // all years present in raw (we'll treat them as history if they have raw.IS)
  const lastHistoricalYear =
    historicalYears.length > 0 ? Number(historicalYears[historicalYears.length - 1]) : null;
  const FORECAST_YEARS = Number(cfg.forecastYears);

  const n = (v: any, fb = 0) => (v === null || v === undefined || Number.isNaN(Number(v)) ? fb : Number(v));

  // ---------- Historical: compute outputs sequentially so we can compute dNWC and historical FCFF ----------
  for (let idx = 0; idx < historicalYears.length; idx++) {
    const year = historicalYears[idx];
    const s = raw[year];
    const inputs = { ...(s.inputs ?? {}) };

    // ensure numeric values
    const revenues = n(inputs.revenues ?? null, 0);
    const cogs = n(inputs.cogs ?? null, 0);
    const sgna = n(inputs.sgna ?? null, 0);
    // depr may be present
    const depr = n(inputs.depr ?? null, 0);
    // financial_expense may be present
    const finExpInput = inputs.financial_expense ?? null;

    const grossProfit = revenues - cogs;
    const ebit = grossProfit - sgna;

    // prevNetDebt must come from computed previous year if available
    // robust extraction of debt from possible debt_components shape
    let debtFromComponents: number | null = null;
    const dc = (inputs as any).debt_components;
    if (dc != null) {
        if (typeof dc === "number") {
            debtFromComponents = Number(dc);
        } else if (typeof dc === "object" && dc.total != null) {
            debtFromComponents = Number(dc.total);
        }
    }

    const net_debt_here = n(
        inputs.net_debt ?? (debtFromComponents ?? null),
        0
    );

    const prevNetDebt = idx > 0 ? n(computed[historicalYears[idx - 1]]?.inputs?.net_debt ?? 0, 0) : net_debt_here;

    // financial expense fallback: prefer explicit input, otherwise estimate from prev net debt
    const financial_expense = Number.isFinite(Number(finExpInput)) && Number(finExpInput) !== 0
      ? n(finExpInput, 0)
      : (prevNetDebt * Number(cfg.interestRate));

    const net_income = (ebit - financial_expense) * (1 - cfg.taxRate);

    // working capital (if inputs present)
    const receivables = n(inputs.receivables ?? null, 0);
    const inventory = n(inputs.inventory ?? null, 0);
    const payables = n(inputs.payables ?? null, 0);
    const nwc = receivables + inventory - payables;

    // prevNWC from previous computed year if available
    let prevNWC = 0;
    if (idx > 0) {
      const prevYear = historicalYears[idx - 1];
      const prevComputed = computed[prevYear];
      if (prevComputed) {
        const pi = prevComputed.inputs ?? {};
        prevNWC = n(pi.receivables, 0) + n(pi.inventory, 0) - n(pi.payables, 0);
      }
    }

    const dNWC = nwc - prevNWC;

    const operating_cf = net_income + depr - dNWC;

    // historical capex and fcff
    const capex = n(inputs.capex ?? null, 0);
    const nopat = ebit * (1 - cfg.taxRate);
    const fcff = nopat + depr - capex - dNWC;

    computed[year] = {
      raw: { ...(s.raw ?? {}) },
      inputs: {
        ...(s.inputs ?? {}),
        net_debt: net_debt_here,
        debt: inputs.debt != null ? n(inputs.debt, 0) : null,
        cash: inputs.cash != null ? n(inputs.cash, 0) : null,
      },
      outputs: {
        ...(s.outputs ?? {}),
        grossProfit,
        ebit,
        financial_expense,
        net_income,
        operating_cf,
        dNWC,
        fcff,
      },
    };
  }

  // ---------- Forecast: same pipeline as before (revenues->items->depr->ppe->NWC->fcff) ----------
  if (lastHistoricalYear !== null) {
    // start prevNWC from last historical inputs if available
    const lastHist = computed[String(lastHistoricalYear)];
    let prevNWC = 0;
    if (lastHist) {
      const pi = lastHist.inputs ?? {};
      prevNWC = n(pi.receivables, 0) + n(pi.inventory, 0) - n(pi.payables, 0);
    }

    for (let i = 1; i <= FORECAST_YEARS; i++) {
      const year = String(lastHistoricalYear + i);
      const prevYear = String(lastHistoricalYear + i - 1);
      const prev = computed[prevYear];
      if (!prev) break;

      const prevInputs = prev.inputs ?? {};
      const prevOutputs = prev.outputs ?? {};

      const prevRevenues = n(prevInputs.revenues ?? (prevOutputs as any).revenues ?? 0);
      const revenues = prevRevenues * Number(cfg.revenueGrowthMultiplier);

      const cogs = revenues * Number(cfg.cogsPct);
      const sgna = revenues * Number(cfg.sgnaPct);
      const capex = revenues * Number(cfg.capexPct);

      const prevPPE = n(prevInputs.ppe, 0);
      const deprFromPpe = prevPPE * Number(cfg.deprOnPpePct);
      const deprFromRev = revenues * Number(cfg.deprPct);
      const depr = Number(cfg.deprOnPpePct) > 0 ? deprFromPpe : deprFromRev;

      const ppe = nextPPE(prevPPE, capex, depr);

      // convert days -> level
      const receivablesDays = Number(cfg.receivablesDays ?? (Number(cfg.receivablesPct) * 365));
      const inventoryDays = Number(cfg.inventoryDays ?? (Number(cfg.inventoryPct) * 365));
      const payablesDays = Number(cfg.payablesDays ?? (Number(cfg.payablesPct) * 365));

      const receivables = revenues * (receivablesDays / 365);
      // inventory/payables based on COGS
      const inventory = cogs !== 0 ? (inventoryDays / 365) * cogs : revenues * Number(cfg.inventoryPct);
      const payables = cogs !== 0 ? (payablesDays / 365) * cogs : revenues * Number(cfg.payablesPct);

      const nwc = receivables + inventory - payables;
      const dNWC = nwc - prevNWC;

      const prevDebtRaw = prevInputs.debt ?? null;
      const prevCashRaw = prevInputs.cash ?? null;
      const net_debt = calcNetDebt({
        prevDebt: prevDebtRaw,
        prevCash: prevCashRaw,
        revenues,
        balanceGrowthPct: cfg.balanceGrowthPct,
        netDebtPctFallback: cfg.netDebtPct,
      });


      const prevNetDebt = n(prevInputs.net_debt ?? prevInputs.debt ?? 0);
      const financial_expense =
        Number(cfg.interestRate) > 0 ? prevNetDebt * Number(cfg.interestRate) : revenues * Number(cfg.finExpPct);

      const grossProfit = revenues - cogs;
      const ebit = grossProfit - sgna;
      const net_income = (ebit - financial_expense) * (1 - cfg.taxRate);

      const operating_cf = net_income + depr - dNWC;
      // FCFF = NOPAT + depr - capex - dNWC
      const nopat = ebit * (1 - cfg.taxRate);
      const fcff = nopat + depr - capex - dNWC;


      // Prev gross debt (if available)
      const prevGrossDebt = n(prevInputs.debt ?? (prevInputs.net_debt != null && prevInputs.cash != null ? (prevInputs.net_debt + prevInputs.cash) : null), 0);

      // Forecast gross debt: prefer growing prevGrossDebt by balanceGrowthPct, otherwise derive from net_debt + cashBegin
      let grossDebtForecast: number;
      if (prevInputs.debt != null) {
        grossDebtForecast = prevGrossDebt * (1 + Number(cfg.balanceGrowthPct));
      } else {
        // fallback: approximate gross debt as net_debt + cashBegin (net_debt = gross - cash => gross = net_debt + cash)
        const cashBegin = n(prevInputs.cash, 0);
        grossDebtForecast = n(net_debt, 0) + cashBegin;
      }

      // deltaGrossDebt = issuance - repayments in this forecast year
      const deltaGrossDebt = grossDebtForecast - prevGrossDebt;


      const cashBegin = n(prevInputs.cash, 0);
      const cashEnd = cashBegin + operating_cf - capex + deltaGrossDebt;

      const inputsForYear: Record<string, number | null> = {
        revenues,
        cogs,
        sgna,
        depr,
        financial_expense,
        capex,
        ppe,
        receivables,
        inventory,
        payables,
        cash : cashEnd,
        net_debt,
        debt: prevInputs.debt ?? null,
      };

      const outputsForYear: Record<string, number | null> = {
        grossProfit,
        ebit,
        net_income,
        operating_cf,
        dNWC,
        fcff,
        cash: cashBegin,
      };

      computed[year] = {
        raw: { IS: {}, BS: {}, CF: {} },
        inputs: inputsForYear,
        outputs: outputsForYear,
      };

      prevNWC = nwc;
    }
  }

  return computed;
}
