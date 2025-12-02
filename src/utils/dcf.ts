import type { Scenario } from "../types/scenario";
import type { DcfParams } from "../types/params";

export function calculateDcfFcff(scenario: Scenario, params: DcfParams) {
  const years = Object.keys(scenario).sort((a,b) => Number(a) - Number(b));

  const lastHistoricalYear = years
    .map(y => Number(y))
    .filter(y => {
      const s = scenario[String(y)];
      return s.raw && Object.keys(s.raw.IS || {}).length > 0;
    })
    .pop() ?? null;

  const forecastYears = lastHistoricalYear === null
    ? years
    : years.filter(y => Number(y) > lastHistoricalYear);

  if (forecastYears.length === 0) {
    return {
      pvCashflows: 0,
      terminalValue: 0,
      pvTerminal: 0,
      enterpriseValue: 0,
      equityValue: 0,
      terminalNetDebt: 0,
      cashflows: [],
    };
  }

  const { wacc, perpetualGrowth: g } = params;

  // taxRate fallback (use params.taxRate if present, otherwise 0.19)
  const taxRate = (params as any).taxRate ?? 0.19;

  const n = (v: any, fb = 0) =>
    v === null || v === undefined || Number.isNaN(Number(v))
      ? fb
      : Number(v);

  // cashflows: now hold FCFF instead of FCFE
  const cashflows: { year: string; fcff: number; discount: number; pv: number }[] = [];

  let prevNWC: number | null = null;

  forecastYears.forEach((year, i) => {
    const s = scenario[year];
    const inp = s.inputs ?? {};
    const out = s.outputs ?? {};

    // get inputs/outputs (with fallbacks)
    const depr = n(inp.depr);
    const capex = n(inp.capex);

    // try to use ebit from outputs; if missing, compute from inputs
    let ebit = n(out.ebit);
    if (!ebit) {
      const revenues = n(inp.revenues);
      const cogs = n(inp.cogs);
      const sgna = n(inp.sgna);
      ebit = revenues - cogs - sgna;
    }

    const receivables = n(inp.receivables);
    const inventory   = n(inp.inventory);
    const payables    = n(inp.payables);

    const nwc = receivables + inventory - payables;
    const dNWC = prevNWC === null ? 0 : (nwc - prevNWC);
    prevNWC = nwc;

    // NOPAT = EBIT * (1 - taxRate)
    const nopat = ebit * (1 - taxRate);

    // FCFF = NOPAT + depreciation - capex - change in NWC
    const fcff =
      nopat +
      depr -
      capex -
      dNWC;

    const t = i + 1;
    const discountFactor = 1 / Math.pow(1 + wacc, t);
    const pv = fcff * discountFactor;

    cashflows.push({ year, fcff, discount: discountFactor, pv });
  });

  // terminal value (on FCFF), guard for wacc <= g
  const last = cashflows[cashflows.length - 1];
  const lastFcff = last?.fcff ?? 0;
  const terminalFcff = lastFcff * (1 + g);
  const denom = wacc - g;
  const safeDenom = Math.abs(denom) < 1e-6 ? (denom < 0 ? -1e-6 : 1e-6) : denom;
  const terminalValue = terminalFcff / safeDenom;

  const nYears = cashflows.length;
  const pvTerminal = terminalValue / Math.pow(1 + wacc, nYears);

  const pvCashflows = cashflows.reduce((acc, x) => acc + x.pv, 0);

  const enterpriseValue = pvCashflows + pvTerminal;

  // net_debt at terminal: prefer inputs of last forecast year
  const lastForecastYear = forecastYears[forecastYears.length - 1];
  const lastInputs = (scenario[lastForecastYear]?.inputs ?? {}) as Record<string, any>;
  const terminalNetDebt = n(lastInputs.net_debt ?? lastInputs.debt ?? 0);

  const rawEquity = enterpriseValue - terminalNetDebt;
  const equityValue = Math.max(rawEquity, 0);

  return {
    pvCashflows,
    terminalValue,
    pvTerminal,
    enterpriseValue,
    terminalNetDebt,
    rawEquity,          // surowa (może być ujemna)
    equityValue,        // sklonowana >= 0 (używane dalej)
    cashflows,
  };
}
