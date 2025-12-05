// src/App.tsx
import { useState, useEffect } from "react";
import CompanySelect from "./components/CompanySelect";
import GlobalControls from "./components/GlobalControls";
import DCFControls from "./components/DCFControls";
import FinancialTable from "./components/FinancialTable";
import { calculateDcfFcff } from "./utils/dcf";
import type { ForecastParams, GlobalParams, DcfParams } from "./types/params";
import { DEFAULT_MODEL_PARAMS } from './utils/defaults';
import { getCompanies } from "./api/valuations";
import type { CompanyDto } from "./api/valuations";
import { buildScenarioFromStatements } from "./utils/scenarioBuilder";
import { computeHistoricalAverages } from "./utils/historicalDefaults";
import DCFResultsTable from "./components/DCFResultsTable";
import type { DCFResults, DCFYearRow } from "./components/DCFResultsTable";


export default function App() {
  const [symbol, setSymbol] = useState<string | null>("TPE");

  const [companyInfo, setCompanyInfo] = useState<CompanyDto | null>(null);

  // global params: renderujemy je nad tabelą (w tym revenue growth jako growth %)
  const [globalParams, setGlobalParams] = useState<GlobalParams>({
    revenueGrowthMultiplier: DEFAULT_MODEL_PARAMS.revenueGrowthMultiplier,
    forecastYears: DEFAULT_MODEL_PARAMS.forecastYears,
    historicalYears: 3,
  });

  // helper: derive default days from defaults (if explicit days not present)
  const defaultReceivablesDays =
    (DEFAULT_MODEL_PARAMS as any).receivablesDays ??
    Math.round((DEFAULT_MODEL_PARAMS.receivablesPct ?? 0) * 365);
  const defaultInventoryDays =
    (DEFAULT_MODEL_PARAMS as any).inventoryDays ??
    Math.round((DEFAULT_MODEL_PARAMS.inventoryPct ?? 0) * 365);
  const defaultPayablesDays =
    (DEFAULT_MODEL_PARAMS as any).payablesDays ??
    Math.round((DEFAULT_MODEL_PARAMS.payablesPct ?? 0) * 365);

  // detailed forecast params (inline controls inside table)
  const [forecastParams, setForecastParams] = useState<ForecastParams>({
    cogsPct: DEFAULT_MODEL_PARAMS.cogsPct,
    sgnaPct: DEFAULT_MODEL_PARAMS.sgnaPct,
    deprOnPpePct: DEFAULT_MODEL_PARAMS.deprOnPpePct,
    // deprPct kept as fallback if you want:
    deprPct: DEFAULT_MODEL_PARAMS.deprPct,
    interestRate: DEFAULT_MODEL_PARAMS.interestRate,
    finExpPct: DEFAULT_MODEL_PARAMS.finExpPct,
    capexPct: DEFAULT_MODEL_PARAMS.capexPct,
    netDebtPct: DEFAULT_MODEL_PARAMS.netDebtPct,
    balanceGrowthPct: DEFAULT_MODEL_PARAMS.balanceGrowthPct,
    receivablesPct: DEFAULT_MODEL_PARAMS.receivablesPct,
    inventoryPct: DEFAULT_MODEL_PARAMS.inventoryPct,
    payablesPct: DEFAULT_MODEL_PARAMS.payablesPct,
    taxRate: DEFAULT_MODEL_PARAMS.taxRate,

    // NEW: days-based defaults (DSO / DIO / DPO)
    receivablesDays: defaultReceivablesDays,
    inventoryDays: defaultInventoryDays,
    payablesDays: defaultPayablesDays,
  });

  const [dcfParams, setDcfParams] = useState<DcfParams>({ wacc: 0.09, perpetualGrowth: 0.02, taxRate: 0.19 });

  // We will compute DCF by fetching scenario from FinancialTable's hook; easiest is to
  // compute DCF inside App by reusing computeScenario: simple approach — request statements here?
  // For simplicity, we skip re-fetching scenario: we show a button that will compute DCF by
  // fetching statements and computing scenario locally (quick helper)
  const [dcfResult, setDcfResult] = useState<any | null>(null);

  // efekt, który pobiera companyInfo po zmianie symbolu (jeśli jeszcze nie masz)
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!symbol) { setCompanyInfo(null); return; }
      try {
        const companies = await getCompanies();
        if (!mounted) return;
        const ci = companies.find(c => c.symbol === symbol) ?? null;
        setCompanyInfo(ci);
      } catch (e) {
        console.error("Could not fetch company info", e);
        setCompanyInfo(null);
      }
    })();
    return () => { mounted = false; };
  }, [symbol]);

  const handleCompanyChange = (s: string | null) => {
  // jeśli wybrano inną spółkę, zamknij tabelę wyników DCF
    if (s !== symbol) {
      setDcfResult(null);
    }
    setSymbol(s);
  };


  const calcAndSetDcf = async () => {
    if (!symbol) return;
    try {
      const resp = await fetch((window.location.origin.includes("localhost") ? "" : "") + `/valuations/api/company/${encodeURIComponent(symbol)}/statements/`, { credentials: 'include' });
      const data = await resp.json();
      const statements = data?.statements ?? {};
      const { buildScenarioFromStatements, computeScenario } = await import("./utils/scenarioBuilder");
      const built = buildScenarioFromStatements(statements);
      const mergedParams = { ...(globalParams ?? {}), ...(forecastParams ?? {}) };
      const scenario = computeScenario(built, mergedParams);

      // używamy FCFE DCF (zwraca equityValue)
      const dcf = calculateDcfFcff(scenario, dcfParams);

      // compute equity per share here (Option A)
      const shares = companyInfo?.shares_outstanding ?? null;
      const equityPerShare = (shares && shares > 0 && Number.isFinite(Number(dcf.equityValue)))
        ? Number(dcf.equityValue) * 1000 / shares
        : null;

      setDcfResult({ ...dcf, equityPerShare });
    } catch (e) {
      console.error("calcAndSetDcf error", e);
      setDcfResult(null);
    }
  };

  const applyHistDefaults = async () => {
    if (!symbol) return alert("Wybierz spółkę");
    try {
      const resp = await fetch(`/valuations/api/company/${encodeURIComponent(symbol)}/statements/`, { credentials: 'include' });
      const data = await resp.json();
      const statements = data?.statements ?? {};
      const built = buildScenarioFromStatements(statements);

      // wybierz histVisible (ostatnie N historycznych lat)
      const yearsAll = Object.keys(built).sort((a,b)=>Number(a)-Number(b));
      const histYears = yearsAll.filter(y => {
        const s = built[y];
        return s && s.raw && Object.keys(s.raw.IS || {}).length > 0;
      });
      const n = globalParams?.historicalYears ?? 3;
      const histVisible = histYears.length <= n ? histYears : histYears.slice(-n);

      const histDefaults = computeHistoricalAverages(built, histVisible);

      // filtrujemy tylko dozwolone kluczy i DSO/DIO/DPO (jeśli są)
      const allowed: Partial<ForecastParams> & { receivablesDays?: number; inventoryDays?: number; payablesDays?: number } = {
        cogsPct: histDefaults.cogsPct,
        sgnaPct: histDefaults.sgnaPct,
        capexPct: histDefaults.capexPct,
        deprOnPpePct: histDefaults.deprOnPpePct,
        deprPct: histDefaults.deprPct,
        interestRate: histDefaults.interestRate,
        finExpPct: histDefaults.finExpPct,
        receivablesPct: histDefaults.receivablesPct,
        inventoryPct: histDefaults.inventoryPct,
        payablesPct: histDefaults.payablesPct,
        netDebtPct: histDefaults.netDebtPct,
        balanceGrowthPct: histDefaults.balanceGrowthPct,
        taxRate: histDefaults.taxRate,
      };

      // Add days if computed by computeHistoricalAverages
      if ((histDefaults as any).receivablesDays !== undefined) (allowed as any).receivablesDays = (histDefaults as any).receivablesDays;
      if ((histDefaults as any).inventoryDays !== undefined) (allowed as any).inventoryDays = (histDefaults as any).inventoryDays;
      if ((histDefaults as any).payablesDays !== undefined) (allowed as any).payablesDays = (histDefaults as any).payablesDays;

      setForecastParams(prev => ({ ...(prev ?? {}), ...(allowed as any) }));
    } catch (e) {
      console.error("apply hist defaults err", e);
      alert("Błąd podczas pobierania danych historycznych — sprawdź konsolę.");
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h1>Husaria Research — DCF PRO</h1>

      <CompanySelect value={symbol} onChange={handleCompanyChange} />

      <div style={{ display: 'flex', gap: 12 }}>
        <GlobalControls params={globalParams} setParams={setGlobalParams} />
        <DCFControls params={dcfParams} setParams={setDcfParams} />
       </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={calcAndSetDcf}>Oblicz</button>
        <button style={{ marginLeft: 8 }} onClick={applyHistDefaults}>Ustaw domyślne z historii</button>
{dcfResult ? (
  (() => {
    // mapujemy wynik DCF -> DCFResults (tylko tabela, bez dodatkowego summary)
    const cashflows = Array.isArray(dcfResult.cashflows) ? dcfResult.cashflows : [];
    const yearRows = cashflows.map((c: any) => ({
      year: String(c.year ?? c.y ?? ""),
      unleveredFCF: typeof c.fcff === "number" ? c.fcff : (typeof c.fcff === "number" ? c.fcff : null),
      discountFactor: typeof c.discount === "number" ? c.discount : (typeof c.df === "number" ? c.df : null),
      pvOfFCF: typeof c.pv === "number" ? c.pv : null,
    }));

    const dcfForTable: DCFResults = {
      years: yearRows.map((r: DCFYearRow) => r.year),
      yearRows,
      terminalValue: dcfResult.terminalValue ?? dcfResult.terminal_value ?? null,
      terminalValueDiscounted: dcfResult.pvTerminal ?? dcfResult.pv_terminal ?? null,
      sumPVofFCF: dcfResult.pvCashflows ?? dcfResult.pv_cashflows ?? null,
      enterpriseValue: dcfResult.enterpriseValue ?? dcfResult.enterprise_value ?? null,
      netDebt: dcfResult.terminalNetDebt ?? dcfResult.terminal_net_debt ?? null,
      equityValue: dcfResult.equityValue ?? dcfResult.equity_value ?? dcfResult.rawEquity ?? null,
      sharesOutstanding: companyInfo?.shares_outstanding ?? null,
      impliedPricePerShare: dcfResult.equityPerShare ?? null,
      assumptions: {
        wacc: dcfParams?.wacc ?? null,
        perpetualGrowth: (dcfParams as any)?.perpetualGrowth ?? (dcfParams as any)?.g ?? null,
        taxRate: (dcfParams as any)?.taxRate ?? null,
      },
    };

    return (
      <div style={{ marginTop: 12 }}>
        <DCFResultsTable dcf={dcfForTable} onClose={() => setDcfResult(null)} />
      </div>
    );
  })()
) : null}

      </div>

      <div style={{ marginTop: 20 }}>
        <FinancialTable
          symbol={symbol}
          forecastParams={forecastParams}
          setForecastParams={setForecastParams}
          globalParams={globalParams}
          setGlobalParams={setGlobalParams}
        />
      </div>


    </div>
  );
}
