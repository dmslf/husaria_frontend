// src/components/ProjectionControls.tsx
import React from "react";
import type { ForecastParams } from "../types/params";

export default function ProjectionControls({
  params,
  setParams,
}: {
  params: ForecastParams;
  setParams: (p: ForecastParams) => void;
}) {
  const update = (patch: Partial<ForecastParams>) => setParams({ ...(params ?? {}), ...patch });

  // --- configuration for allowed ranges (UI shows 0..100 for percents) ---
  const PCT_MIN = 0;
  const PCT_MAX = 100;
  const BALANCE_GROWTH_MIN = 0;
  const BALANCE_GROWTH_MAX = 100;
  const TAX_MIN = 0;
  const TAX_MAX = 100;
  // sensible per-line overrides
  const OVERRIDES: Record<string, { min?: number; max?: number }> = {
    deprPct: { min: 0, max: 30 },
    sgnaPct: { min: 0, max: 50 },
    capexPct: { min: 0, max: 50 },
    netDebtPct: { min: 0, max: 100 },
  };

  // defaults (internal 0..1 values)
  const defaults = {
    cogsPct: 0.6,
    sgnaPct: 0.15,
    deprPct: 0.05,
    finExpPct: 0.02,
    capexPct: 0.05,
    netDebtPct: 0.2,
    balanceGrowthPct: 0.02,
    taxRate: 0.19,
    // days defaults (derived from pct by multiplying 365)
    receivablesDays: (0.10 * 365),
    inventoryDays: (0.08 * 365),
    payablesDays: (0.06 * 365),
  } as const;

  // helper clampers
  const clamp = (v: number, min: number, max: number) => (Number.isFinite(v) ? Math.min(Math.max(v, min), max) : min);
  const pctToInternal = (pct: number) => clamp(pct / 100, 0, 1);
  const internalToPct = (v?: number, fallback = 0) => Math.round(((v ?? fallback) as number) * 100);

  // local states for user-friendly editing (UI: 0..100)
  const [localCogs, setLocalCogs] = React.useState<number>(internalToPct(params.cogsPct, defaults.cogsPct));
  const [localSgna, setLocalSgna] = React.useState<number>(internalToPct(params.sgnaPct, defaults.sgnaPct));
  const [localDepr, setLocalDepr] = React.useState<number>(internalToPct(params.deprPct, defaults.deprPct));
  const [localFinExp, setLocalFinExp] = React.useState<number>(internalToPct(params.finExpPct, defaults.finExpPct));
  const [localCapex, setLocalCapex] = React.useState<number>(internalToPct(params.capexPct, defaults.capexPct));
  const [localNetDebt, setLocalNetDebt] = React.useState<number>(internalToPct(params.netDebtPct, defaults.netDebtPct));
  const [localBalanceGrowth, setLocalBalanceGrowth] = React.useState<number>(internalToPct(params.balanceGrowthPct, defaults.balanceGrowthPct));
  const [localTaxRate, setLocalTaxRate] = React.useState<number>(internalToPct(params.taxRate, defaults.taxRate));

  // days local states (UI in days)
  const DAYS_MIN = 0;
  const DAYS_MAX = 365 * 3;
  const [localReceivablesDays, setLocalReceivablesDays] = React.useState<number>(Math.round(params.receivablesDays ?? defaults.receivablesDays));
  const [localInventoryDays, setLocalInventoryDays] = React.useState<number>(Math.round(params.inventoryDays ?? defaults.inventoryDays));
  const [localPayablesDays, setLocalPayablesDays] = React.useState<number>(Math.round(params.payablesDays ?? defaults.payablesDays));

  // sync when external params change
  React.useEffect(() => {
    setLocalCogs(internalToPct(params.cogsPct, defaults.cogsPct));
    setLocalSgna(internalToPct(params.sgnaPct, defaults.sgnaPct));
    setLocalDepr(internalToPct(params.deprPct, defaults.deprPct));
    setLocalFinExp(internalToPct(params.finExpPct, defaults.finExpPct));
    setLocalCapex(internalToPct(params.capexPct, defaults.capexPct));
    setLocalNetDebt(internalToPct(params.netDebtPct, defaults.netDebtPct));
    setLocalBalanceGrowth(internalToPct(params.balanceGrowthPct, defaults.balanceGrowthPct));
    setLocalTaxRate(internalToPct(params.taxRate, defaults.taxRate));

    setLocalReceivablesDays(Math.round(params.receivablesDays ?? defaults.receivablesDays));
    setLocalInventoryDays(Math.round(params.inventoryDays ?? defaults.inventoryDays));
    setLocalPayablesDays(Math.round(params.payablesDays ?? defaults.payablesDays));
  }, [
    params.cogsPct,
    params.sgnaPct,
    params.deprPct,
    params.finExpPct,
    params.capexPct,
    params.netDebtPct,
    params.balanceGrowthPct,
    params.taxRate,
    params.receivablesDays,
    params.inventoryDays,
    params.payablesDays,
  ]);

  // generic handler for immediate updates from sliders
  const onPctImmediate = (key: keyof ForecastParams, uiValue: number, localSetter: (v: number) => void) => {
    const override = OVERRIDES[key as string] ?? {};
    const min = override.min ?? PCT_MIN;
    const max = override.max ?? PCT_MAX;
    const clamped = clamp(Math.round(uiValue), min, max);
    localSetter(clamped);
    update({ [key]: pctToInternal(clamped) } as Partial<ForecastParams>);
  };

  // handler for number inputs (onBlur commit)
  const onPctBlurCommit = (key: keyof ForecastParams, localValue: number) => {
    const override = OVERRIDES[key as string] ?? {};
    const min = override.min ?? PCT_MIN;
    const max = override.max ?? PCT_MAX;
    const clamped = clamp(Math.round(localValue), min, max);
    update({ [key]: pctToInternal(clamped) } as Partial<ForecastParams>);
  };

  // handlers for days controls
  const clampDays = (v: number) => Math.round(Math.max(DAYS_MIN, Math.min(DAYS_MAX, v)));
  const onDaysImmediate = (key: "receivablesDays" | "inventoryDays" | "payablesDays", value: number, localSetter: (n: number) => void) => {
    const clamped = clampDays(value);
    localSetter(clamped);
    update({ [key]: clamped } as Partial<ForecastParams>);
  };
  const onDaysBlur = (key: "receivablesDays" | "inventoryDays" | "payablesDays", localValue: number) => {
    const clamped = clampDays(localValue);
    update({ [key]: clamped } as Partial<ForecastParams>);
  };

  return (
    <div style={{ marginBottom: 12, padding: 8, border: "1px solid #eee" }}>
      <h4>Projection controls (detailed)</h4>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block" }}>COGS (% of revenue)</label>
        <input
          type="range"
          min={OVERRIDES.cogsPct?.min ?? PCT_MIN}
          max={OVERRIDES.cogsPct?.max ?? PCT_MAX}
          value={localCogs}
          onChange={(e) => onPctImmediate("cogsPct", Number(e.target.value), setLocalCogs)}
        />
        <input
          type="number"
          min={OVERRIDES.cogsPct?.min ?? PCT_MIN}
          max={OVERRIDES.cogsPct?.max ?? PCT_MAX}
          value={localCogs}
          onChange={(e) => setLocalCogs(Number(e.target.value))}
          onBlur={() => onPctBlurCommit("cogsPct", localCogs)}
          style={{ width: 64, marginLeft: 8 }}
        />
        <div style={{ fontSize: 12, color: "#666" }}>% przychodów</div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block" }}>SG&A (% of revenue)</label>
        <input
          type="range"
          min={OVERRIDES.sgnaPct?.min ?? PCT_MIN}
          max={OVERRIDES.sgnaPct?.max ?? PCT_MAX}
          value={localSgna}
          onChange={(e) => onPctImmediate("sgnaPct", Number(e.target.value), setLocalSgna)}
        />
        <input
          type="number"
          min={OVERRIDES.sgnaPct?.min ?? PCT_MIN}
          max={OVERRIDES.sgnaPct?.max ?? PCT_MAX}
          value={localSgna}
          onChange={(e) => setLocalSgna(Number(e.target.value))}
          onBlur={() => onPctBlurCommit("sgnaPct", localSgna)}
          style={{ width: 64, marginLeft: 8 }}
        />
        <div style={{ fontSize: 12, color: "#666" }}>% przychodów</div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block" }}>Depreciation (% of revenue)</label>
        <input
          type="range"
          min={OVERRIDES.deprPct?.min ?? PCT_MIN}
          max={OVERRIDES.deprPct?.max ?? PCT_MAX}
          value={localDepr}
          onChange={(e) => onPctImmediate("deprPct", Number(e.target.value), setLocalDepr)}
        />
        <input
          type="number"
          min={OVERRIDES.deprPct?.min ?? PCT_MIN}
          max={OVERRIDES.deprPct?.max ?? PCT_MAX}
          value={localDepr}
          onChange={(e) => setLocalDepr(Number(e.target.value))}
          onBlur={() => onPctBlurCommit("deprPct", localDepr)}
          style={{ width: 64, marginLeft: 8 }}
        />
        <div style={{ fontSize: 12, color: "#666" }}>% przychodów</div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block" }}>Financial expense (% of revenue)</label>
        <input
          type="range"
          min={PCT_MIN}
          max={PCT_MAX}
          value={localFinExp}
          onChange={(e) => onPctImmediate("finExpPct", Number(e.target.value), setLocalFinExp)}
        />
        <input
          type="number"
          min={PCT_MIN}
          max={PCT_MAX}
          value={localFinExp}
          onChange={(e) => setLocalFinExp(Number(e.target.value))}
          onBlur={() => onPctBlurCommit("finExpPct", localFinExp)}
          style={{ width: 64, marginLeft: 8 }}
        />
        <div style={{ fontSize: 12, color: "#666" }}>% przychodów (fallback)</div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block" }}>CapEx (% of revenue)</label>
        <input
          type="range"
          min={OVERRIDES.capexPct?.min ?? PCT_MIN}
          max={OVERRIDES.capexPct?.max ?? PCT_MAX}
          value={localCapex}
          onChange={(e) => onPctImmediate("capexPct", Number(e.target.value), setLocalCapex)}
        />
        <input
          type="number"
          min={OVERRIDES.capexPct?.min ?? PCT_MIN}
          max={OVERRIDES.capexPct?.max ?? PCT_MAX}
          value={localCapex}
          onChange={(e) => setLocalCapex(Number(e.target.value))}
          onBlur={() => onPctBlurCommit("capexPct", localCapex)}
          style={{ width: 64, marginLeft: 8 }}
        />
        <div style={{ fontSize: 12, color: "#666" }}>% przychodów</div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block" }}>Net debt fallback (% of revenue)</label>
        <input
          type="range"
          min={OVERRIDES.netDebtPct?.min ?? PCT_MIN}
          max={OVERRIDES.netDebtPct?.max ?? PCT_MAX}
          value={localNetDebt}
          onChange={(e) => onPctImmediate("netDebtPct", Number(e.target.value), setLocalNetDebt)}
        />
        <input
          type="number"
          min={OVERRIDES.netDebtPct?.min ?? PCT_MIN}
          max={OVERRIDES.netDebtPct?.max ?? PCT_MAX}
          value={localNetDebt}
          onChange={(e) => setLocalNetDebt(Number(e.target.value))}
          onBlur={() => onPctBlurCommit("netDebtPct", localNetDebt)}
          style={{ width: 64, marginLeft: 8 }}
        />
        <div style={{ fontSize: 12, color: "#666" }}>% przychodów (fallback jeśli brak danych)</div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block" }}>Balance items growth (% p.a.)</label>
        <input
          type="range"
          min={BALANCE_GROWTH_MIN}
          max={BALANCE_GROWTH_MAX}
          value={localBalanceGrowth}
          onChange={(e) => onPctImmediate("balanceGrowthPct", Number(e.target.value), setLocalBalanceGrowth)}
        />
        <input
          type="number"
          min={BALANCE_GROWTH_MIN}
          max={BALANCE_GROWTH_MAX}
          value={localBalanceGrowth}
          onChange={(e) => setLocalBalanceGrowth(Number(e.target.value))}
          onBlur={() => onPctBlurCommit("balanceGrowthPct", localBalanceGrowth)}
          style={{ width: 64, marginLeft: 8 }}
        />
        <div style={{ fontSize: 12, color: "#666" }}>% przychodów rocznie (dla cash/AR/inv/payables)</div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block" }}>Tax rate (%)</label>
        <input
          type="range"
          min={TAX_MIN}
          max={TAX_MAX}
          value={localTaxRate}
          onChange={(e) => onPctImmediate("taxRate", Number(e.target.value), setLocalTaxRate)}
        />
        <input
          type="number"
          min={TAX_MIN}
          max={TAX_MAX}
          value={localTaxRate}
          onChange={(e) => setLocalTaxRate(Number(e.target.value))}
          onBlur={() => onPctBlurCommit("taxRate", localTaxRate)}
          style={{ width: 64, marginLeft: 8 }}
        />
        <div style={{ fontSize: 12, color: "#666" }}>%</div>
      </div>

      {/* --- Days controls (DSO / DIO / DPO) --- */}
      <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
        <h5>Working capital (days)</h5>

        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
          <div>
            <label style={{ display: "block" }}>Receivables days (DSO)</label>
            <input
              type="range"
              min={DAYS_MIN}
              max={DAYS_MAX}
              value={localReceivablesDays}
              onChange={(e) => onDaysImmediate("receivablesDays", Number(e.target.value), setLocalReceivablesDays)}
            />
            <input
              type="number"
              min={DAYS_MIN}
              max={DAYS_MAX}
              value={localReceivablesDays}
              onChange={(e) => setLocalReceivablesDays(Number(e.target.value))}
              onBlur={() => onDaysBlur("receivablesDays", localReceivablesDays)}
              style={{ width: 80, marginLeft: 8 }}
            />
          </div>

          <div>
            <label style={{ display: "block" }}>Inventory days (DIO)</label>
            <input
              type="range"
              min={DAYS_MIN}
              max={DAYS_MAX}
              value={localInventoryDays}
              onChange={(e) => onDaysImmediate("inventoryDays", Number(e.target.value), setLocalInventoryDays)}
            />
            <input
              type="number"
              min={DAYS_MIN}
              max={DAYS_MAX}
              value={localInventoryDays}
              onChange={(e) => setLocalInventoryDays(Number(e.target.value))}
              onBlur={() => onDaysBlur("inventoryDays", localInventoryDays)}
              style={{ width: 80, marginLeft: 8 }}
            />
          </div>

          <div>
            <label style={{ display: "block" }}>Payables days (DPO)</label>
            <input
              type="range"
              min={DAYS_MIN}
              max={DAYS_MAX}
              value={localPayablesDays}
              onChange={(e) => onDaysImmediate("payablesDays", Number(e.target.value), setLocalPayablesDays)}
            />
            <input
              type="number"
              min={DAYS_MIN}
              max={DAYS_MAX}
              value={localPayablesDays}
              onChange={(e) => setLocalPayablesDays(Number(e.target.value))}
              onBlur={() => onDaysBlur("payablesDays", localPayablesDays)}
              style={{ width: 80, marginLeft: 8 }}
            />
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#666" }}>
          Inventory uses COGS as denominator (DIO * COGS / 365). Receivables use revenues (DSO * revenues / 365).
        </div>
      </div>
    </div>
  );
}
