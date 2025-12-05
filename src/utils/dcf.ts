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
  const taxRate = (params as any).taxRate ?? 0.19;

  const n = (v: any, fb = 0) =>
    v === null || v === undefined || Number.isNaN(Number(v))
      ? fb
      : Number(v);

  const cashflows: { year: string; fcff: number; discount: number; pv: number }[] = [];

  // --- INIT prevNWC based on last historical year if available (fixes missing deltaNWC for first forecast year)
  let prevNWC: number | null = null;
  if (lastHistoricalYear !== null) {
    const lastHist = scenario[String(lastHistoricalYear)];
    if (lastHist && lastHist.inputs) {
      const li = lastHist.inputs;
      prevNWC = n(li.receivables) + n(li.inventory) - n(li.payables);
    }
  }

  forecastYears.forEach((year, i) => {
    const s = scenario[year];
    const inp = s.inputs ?? {};
    const out = s.outputs ?? {};

    const depr = n(inp.depr);
    const capex = n(inp.capex);

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

    // Prefer using precomputed outputs.dNWC when present (computeScenario already provides it).
    // Otherwise fall back to computing delta from prevNWC (which we've initialized from last historical year when possible).
    let dNWC: number;
    if (out && out.dNWC != null && !Number.isNaN(Number(out.dNWC))) {
      dNWC = Number(out.dNWC);
      // keep prevNWC consistent for subsequent years
      prevNWC = nwc;
    } else {
      if (prevNWC === null) {
        // if still null, interpret delta as 0 (no prior info)
        dNWC = 0;
      } else {
        dNWC = nwc - prevNWC;
      }
      prevNWC = nwc;
    }

    const nopat = ebit * (1 - taxRate);

    const fcff = nopat + depr - capex - dNWC;

    const t = i + 1;
    const discountFactor = 1 / Math.pow(1 + wacc, t);
    const pv = fcff * discountFactor;

    cashflows.push({ year, fcff, discount: discountFactor, pv });
  });

  // terminal value
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
    rawEquity,
    equityValue,
    cashflows,
  };
}
