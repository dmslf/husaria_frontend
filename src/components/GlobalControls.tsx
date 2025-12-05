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
    const pct = Number.isFinite(uiPct) ? uiPct : 5;
    update({ revenueGrowthMultiplier: 1 + pct / 100 });
  };

  const onForecastYears = (v: number) => update({ forecastYears: Math.max(1, Math.min(5, Math.round(v))) });
  const onHistoricalYears = (v: number) => update({ historicalYears: Math.max(1, Math.min(5, Math.round(v))) });

  return (
    <div style={{ border: "1px solid #eee", padding: 8, marginBottom: 8 }}>
      <h4>Zmienne globalne</h4>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block" }}>Wzrost przychodów (roczny, %)</label>
        <input
          type="range"
          min={-50}
          max={100}
          value={growthUi}
          onChange={(e) => onGrowthChange(Number(e.target.value))}
        />
        {/* number input: non-controlled, commit on blur; key ensures remount when external value changes */}
        <input
          key={growthUi}
          type="number"
          min={-50}
          max={100}
          defaultValue={growthUi}
          onBlur={(e) => {
            const raw = e.currentTarget.value;
            if (raw === "") {
              e.currentTarget.value = String(growthUi);
              onGrowthChange(growthUi);
              return;
            }
            const parsed = Number(raw);
            if (Number.isNaN(parsed)) {
              e.currentTarget.value = String(growthUi);
              return;
            }
            // <-- CLAMP to allowed range (-50..100)
            const clamped = Math.min(Math.max(Math.round(parsed), -50), 100);
            onGrowthChange(clamped);
            e.currentTarget.value = String(clamped);
          }}
          style={{ width: 70, marginLeft: 8 }}
        />

        <div style={{ fontSize: 12, color: "#666" }}>
          Podaj tempo wzrostu przychodów w prognozowanych latach
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block" }}>Lata prognozowane</label>
        <input
          type="range"
          min={1}
          max={5}
          value={params.forecastYears ?? 3}
          onChange={(e) => onForecastYears(Number(e.target.value))}
        />
        <input
          key={params.forecastYears ?? 3}
          type="number"
          min={1}
          max={5}
          defaultValue={params.forecastYears ?? 3}
          onBlur={(e) => {
            const raw = e.currentTarget.value;
            const parsed = raw === "" ? 1 : Number(raw);
            if (Number.isNaN(parsed)) {
              e.currentTarget.value = String(params.forecastYears ?? 3);
              return;
            }
            const clamped = Math.max(1, Math.min(5, Math.round(parsed)));
            onForecastYears(clamped);
            e.currentTarget.value = String(clamped);
          }}
          style={{ width: 64, marginLeft: 8 }}
        />
        <div style={{ fontSize: 12, color: "#666" }}>Na ile lat robić prognozę</div>
      </div>

      <div>
        <label style={{ display: "block" }}>Lata historyczne</label>
        <input
          type="range"
          min={1}
          max={5}
          value={params.historicalYears ?? 3}
          onChange={(e) => onHistoricalYears(Number(e.target.value))}
        />
        <input
          key={params.historicalYears ?? 3}
          type="number"
          min={1}
          max={5}
          defaultValue={params.historicalYears ?? 3}
          onBlur={(e) => {
            const raw = e.currentTarget.value;
            const parsed = raw === "" ? 1 : Number(raw);
            if (Number.isNaN(parsed)) {
              e.currentTarget.value = String(params.historicalYears ?? 3);
              return;
            }
            const clamped = Math.max(1, Math.min(5, Math.round(parsed)));
            onHistoricalYears(clamped);
            e.currentTarget.value = String(clamped);
          }}
          style={{ width: 64, marginLeft: 8 }}
        />
        <div style={{ fontSize: 12, color: "#666" }}>
          Ile ostatnich lat historycznych pokazać
        </div>
      </div>
    </div>
  );
}
