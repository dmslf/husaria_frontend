// src/components/GlobalControls.tsx
import type { GlobalParams } from "../types/params";

export default function GlobalControls({
  params,
  setParams,
}: {
  params: GlobalParams;
  setParams: (p: GlobalParams) => void;
}) {
  const update = (patch: Partial<GlobalParams>) => setParams({ ...(params ?? {}), ...patch });

  const growthUi = Math.round(((params.revenueGrowthMultiplier ?? 1.05) - 1) * 100);

  const onGrowthChange = (uiPct: number) => {
    // clamp uiPct to reasonable range if needed
    const pct = Number.isFinite(uiPct) ? uiPct : 5;
    update({ revenueGrowthMultiplier: 1 + pct / 100 });
  };

  const onForecastYears = (v: number) => update({ forecastYears: Math.max(1, Math.min(5, Math.round(v))) });
  const onHistoricalYears = (v: number) => update({ historicalYears: Math.max(1, Math.min(5, Math.round(v))) });

  return (
    <div style={{ border: "1px solid #eee", padding: 8, marginBottom: 8 }}>
      <h4>Global controls</h4>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block" }}>Revenue growth (annual, %)</label>
        <input type="range" min={-50} max={200} value={growthUi} onChange={(e) => onGrowthChange(Number(e.target.value))} />
        <input type="number" value={growthUi} onChange={(e) => onGrowthChange(Number(e.target.value))} style={{ width: 70, marginLeft: 8 }} />
        <div style={{ fontSize: 12, color: "#666" }}>Wskaż wzrost przychodów rocznie (UI: % — we store multiplier)</div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block" }}>Forecast years</label>
        <input type="range" min={1} max={5} value={params.forecastYears ?? 3} onChange={(e) => onForecastYears(Number(e.target.value))} />
        <input type="number" min={1} max={5} value={params.forecastYears ?? 3} onChange={(e) => onForecastYears(Number(e.target.value))} style={{ width: 64, marginLeft: 8 }} />
        <div style={{ fontSize: 12, color: "#666" }}>Ile lat prognóz</div>
      </div>

      <div>
        <label style={{ display: "block" }}>Historical years (display)</label>
        <input type="range" min={1} max={5} value={params.historicalYears ?? 3} onChange={(e) => onHistoricalYears(Number(e.target.value))} />
        <input type="number" min={1} max={5} value={params.historicalYears ?? 3} onChange={(e) => onHistoricalYears(Number(e.target.value))} style={{ width: 64, marginLeft: 8 }} />
        <div style={{ fontSize: 12, color: "#666" }}>Ile ostatnich lat historycznych pokazać</div>
      </div>
    </div>
  );
}
