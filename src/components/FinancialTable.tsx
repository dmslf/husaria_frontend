// src/components/FinancialTable.tsx
import React from "react";
import { getCompanyStatements } from "../api/valuations";
import { useScenario } from "../hooks/useScenario";
import { LINE_DEFS, type LineDef } from "../types/scenario";
import type { ForecastParams, GlobalParams } from "../types/params";

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return "-";
  const num = Number(n);
  if (Number.isNaN(num)) return "-";
  return Math.round(num).toLocaleString("pl-PL");
}

export default function FinancialTable({
  symbol,
  forecastParams,
  setForecastParams,
  globalParams,
}: {
  symbol: string | null;
  forecastParams: ForecastParams;
  setForecastParams?: (p: ForecastParams) => void;
  globalParams?: GlobalParams;
  setGlobalParams?: (p: GlobalParams) => void;
}) {
  const [apiStatements, setApiStatements] = React.useState<Record<string, any> | null>(null);
  const [loadingApi, setLoadingApi] = React.useState(true);
  const [errorApi, setErrorApi] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!symbol) {
      setApiStatements(null);
      setLoadingApi(false);
      return;
    }
    let mounted = true;
    setLoadingApi(true);
    (async () => {
      try {
        const resp = await getCompanyStatements(symbol);
        if (!mounted) return;
        setApiStatements(resp?.statements ?? null);
      } catch (e: any) {
        console.error("FinancialTable api error", e);
        setErrorApi(e?.message ?? "Błąd API");
        setApiStatements(null);
      } finally {
        if (mounted) setLoadingApi(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [symbol]);

  const { scenario, years, lastHistoricalYear, loading: loadingScenario } =
    useScenario(apiStatements, globalParams, forecastParams);

  if (!symbol) return <div>Wybierz spółkę</div>;
  if (loadingApi) return <div>Ładowanie danych z API...</div>;
  if (errorApi) return <div style={{ color: "crimson" }}>Błąd API: {errorApi}</div>;
  if (loadingScenario) return <div>Przeliczanie scenariusza...</div>;
  if (!scenario || years.length === 0) return <div>Brak danych do wyświetlenia</div>;

  // --- Use LINE_DEFS order exactly as provided in types ---
  const rows: LineDef[] = LINE_DEFS;

  const isHistoricalYear = (year: string) => {
    if (lastHistoricalYear === null) return false;
    return Number(year) <= lastHistoricalYear;
  };

  // Determine visible years according to user's setting (historicalYears)
  const RAW_REQUESTED_HISTORICAL = globalParams?.historicalYears ?? 3;
  const requestedHistorical = Number.isFinite(RAW_REQUESTED_HISTORICAL)
    ? Math.max(1, Math.round(RAW_REQUESTED_HISTORICAL))
    : 3;

  const histYearsAll = lastHistoricalYear === null ? [] : years.filter((y) => Number(y) <= lastHistoricalYear);
  const forecastYearsAll = lastHistoricalYear === null ? years.slice() : years.filter((y) => Number(y) > lastHistoricalYear);
  const histVisible = histYearsAll.length <= requestedHistorical ? histYearsAll : histYearsAll.slice(-requestedHistorical);
  const visibleYears = [...histVisible, ...forecastYearsAll];

  // inline styles
  const sectionHeaderStyle: React.CSSProperties = {
    background: "#f0f4ff",
    fontWeight: 700,
    padding: "8px 6px",
  };
  const rowLabelStyle: React.CSSProperties = { padding: 6, fontWeight: 500 };
  const cellStyle: React.CSSProperties = { padding: 6, textAlign: "right", minWidth: 120 };

  const uiToInternalPct = (uiPct: number) => Math.min(Math.max(uiPct / 100, 0), 1);
  const internalToUI = (v?: number, fallback = 0) => Math.round((v ?? fallback) * 100);

  const updateParams = (patch: Partial<ForecastParams>) => {
    if (!setForecastParams) return;
    setForecastParams({ ...(forecastParams ?? {}), ...patch });
  };

  // helper to handle days controls (DSO/DIO/DPO)
  const DAYS_MIN = 0;
  const DAYS_MAX = 365;
  const daysValue = (key: "receivablesDays" | "inventoryDays" | "payablesDays") =>
    Number(((forecastParams as any)?.[key] ?? 0));


  const setDays = (key: "receivablesDays" | "inventoryDays" | "payablesDays", value: number) => {
    const clamped = Math.max(DAYS_MIN, Math.min(DAYS_MAX, Math.round(value)));
    if (!setForecastParams) return;
    setForecastParams({ ...(forecastParams ?? {}), [key]: clamped } as Partial<ForecastParams>);
  };

  // Build tbody
  const bodyRows: React.ReactNode[] = [];
  let lastCategory: string | null = null;

  for (const r of rows) {
    const cat = r.category ?? "OTHER";
    if (cat !== lastCategory) {
      bodyRows.push(
        <tr key={`hdr-${cat}`}>
          <td colSpan={visibleYears.length + 1} style={sectionHeaderStyle}>
            {cat === "IS" ? "Rachunek zysków i strat" : cat === "BS" ? "Bilans" : cat === "CF" ? "Przepływy pieniężne" : "Other"}
          </td>
        </tr>
      );
      lastCategory = cat;
    }

    bodyRows.push(
      <tr key={r.id}>
        <td style={rowLabelStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>
              {r.label}{" "}
              <small style={{ color: "#666", fontWeight: 400 }}>
                {r.kind === "artifact" ? "(read-only)" : r.kind === "calculated" ? "(calc)" : ""}
              </small>
            </span>

            {/* inline control (reads r.control metadata) */}
            {r.showControl && r.control && setForecastParams ? (() => {
              const ctrl = r.control;
              const paramKey = ctrl.param as keyof ForecastParams;

              // If this is a working capital field, render days control instead of percent
              if (r.id === "receivables" || r.id === "inventory" || r.id === "payables") {
                // map to days key
                const daysKey = r.id === "receivables" ? "receivablesDays" : r.id === "inventory" ? "inventoryDays" : "payablesDays";
                const currentDays = daysValue(daysKey);

                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
                    <input
                      type="range"
                      min={DAYS_MIN}
                      max={DAYS_MAX}
                      value={currentDays}
                      onChange={(e) => setDays(daysKey as any, Number(e.target.value))}
                      style={{ width: 140 }}
                    />
                    <input
                      key={currentDays}
                      type="number"
                      min={DAYS_MIN}
                      max={DAYS_MAX}
                      defaultValue={currentDays}
                      onBlur={(e) => {
                        const raw = e.currentTarget.value;
                        const parsed = raw === "" ? DAYS_MIN : Number(raw);
                        const clamped = Math.max(DAYS_MIN, Math.min(DAYS_MAX, Math.round(parsed)));
                        setDays(daysKey as any, clamped);
                        e.currentTarget.value = String(clamped);
                      }}
                      style={{ width: 80 }}
                    />

                    <div style={{ fontSize: 12, color: "#666" }}>
                      {r.id === "receivables" ? "DSO" : r.id === "inventory" ? "DIO" : "DPO"}
                    </div>
                  </div>
                );
              }
              // wewnątrz renderowania kontrolki (zamiast istniejącego bloku):
              const uiVal = internalToUI(forecastParams?.[paramKey] as number | undefined, 0);
              const min = ctrl.min ?? 0;
              const max = ctrl.max ?? 100;
              const help = ctrl.help ?? "% przychodów";

              return (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {/* suwak — zostaje kontrolowany i działa natychmiast */}
                    <input
                      type="range"
                      min={min}
                      max={max}
                      value={uiVal}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        updateParams({ [paramKey]: uiToInternalPct(v) } as Partial<ForecastParams>);
                      }}
                      style={{ width: 120 }}
                    />

                    {/* liczba — ZMIANA: używamy defaultValue + onBlur; dodajemy key żeby się zresetowało gdy uiVal się zmieni */}
                    <input
                      key={uiVal}                // powoduje remount gdy uiVal się zmieni -> synchronizacja
                      type="number"
                      min={min}
                      max={max}
                      defaultValue={uiVal}       // niekontrolowane pole pozwalające na usunięcie zawartości
                      onBlur={(e) => {
                        const raw = e.currentTarget.value;
                        if (raw === "") {
                          // interpretujemy puste jako min lub możesz wybrać inny fallback
                          updateParams({ [paramKey]: uiToInternalPct(min) } as Partial<ForecastParams>);
                          // ustawiamy wartość pola poprzez assignment (bez setState, bo pole jest niekontrolowane)
                          e.currentTarget.value = String(min);
                          return;
                        }
                        const parsed = Number(raw);
                        if (Number.isNaN(parsed)) {
                          // przy nie-numerycznym wejściu cofnij do uiVal
                          e.currentTarget.value = String(uiVal);
                          return;
                        }
                        const clamped = Math.min(Math.max(Math.round(parsed), min), max);
                        updateParams({ [paramKey]: uiToInternalPct(clamped) } as Partial<ForecastParams>);
                        e.currentTarget.value = String(clamped);
                      }}
                      style={{ width: 60 }}
                    />
                    <span style={{ color: "#666", fontSize: 12 }}>%</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{help}</div>
                </div>
              );

            })() : null}

          </div>
        </td>
        {visibleYears.map((y) => {
          const val = (scenario[y] as any)?.[r.source]?.[r.id] ?? null;
          return (
            <td key={y + r.id} style={cellStyle}>
              {fmt(val)}
            </td>
          );
        })}
      </tr>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      <h3>{symbol} — Dane finansowe (historyczne + prognoza)</h3>
      <table style={{ borderCollapse: "collapse", width: "100%" }} border={1}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 6 }}>Pozycja \ Rok</th>
            {visibleYears.map((y) => {
              const isF = !isHistoricalYear(y);
              return (
                <th
                  key={y}
                  style={{ padding: 6, textAlign: "right", background: isF ? "#f3f7ff" : undefined }}
                >
                  {y}
                  {isF ? " (F)" : ""}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{bodyRows}</tbody>
      </table>
    </div>
  );
}
