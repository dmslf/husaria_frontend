// src/components/DCFControls.tsx
import type { DcfParams } from "../types/params";

export default function DCFControls({
  params,
  setParams,
}: {
  params: DcfParams;
  setParams: (p: DcfParams) => void;
}) {
  const update = (patch: Partial<DcfParams>) => setParams({ ...params, ...patch });

  // Sensowne granice
  const WACC_MIN = 0;
  const WACC_MAX = 0.50;

  const G_MIN = -0.05;
  const G_MAX = 0.05;

  const TAX_MIN = 0;
  const TAX_MAX = 0.50;

  const clamp = (v: number, min: number, max: number) =>
    Number.isFinite(v) ? Math.min(Math.max(v, min), max) : min;

  return (
    <div style={{ marginBottom: 12, padding: 8, border: "1px solid #eee" }}>
      <h4>Parametry DCF</h4>

      {/* --- WACC --- */}
      <label>
        Koszt kapitału (WACC) (np. 0.09):
        <input
          key={params.wacc}
          type="number"
          step="0.001"
          min={WACC_MIN}
          max={WACC_MAX}
          defaultValue={params.wacc}
          onBlur={(e) => {
            const raw = e.currentTarget.value;
            if (raw === "") {
              e.currentTarget.value = String(params.wacc);
              return;
            }
            const parsed = Number(raw);
            if (Number.isNaN(parsed)) {
              e.currentTarget.value = String(params.wacc);
              return;
            }
            const clamped = clamp(parsed, WACC_MIN, WACC_MAX);
            update({ wacc: clamped });
            e.currentTarget.value = String(clamped);
          }}
          style={{ marginLeft: 8 }}
        />
      </label>

      <br />

      {/* --- PERPETUAL GROWTH --- */}
      <label>
        Długoterminowa stopa wzrostu (np. 0.02):
        <input
          key={params.perpetualGrowth}
          type="number"
          step="0.001"
          min={G_MIN}
          max={G_MAX}
          defaultValue={params.perpetualGrowth}
          onBlur={(e) => {
            const raw = e.currentTarget.value;
            if (raw === "") {
              e.currentTarget.value = String(params.perpetualGrowth);
              return;
            }
            const parsed = Number(raw);
            if (Number.isNaN(parsed)) {
              e.currentTarget.value = String(params.perpetualGrowth);
              return;
            }
            const clamped = clamp(parsed, G_MIN, G_MAX);
            update({ perpetualGrowth: clamped });
            e.currentTarget.value = String(clamped);
          }}
          style={{ marginLeft: 8 }}
        />
      </label>

      <br />

      {/* --- TAX RATE --- */}
      <label>
        Stawka podatkowa (np. 0.19):
        <input
          key={params.taxRate ?? 0.19}
          type="number"
          step="0.001"
          min={TAX_MIN}
          max={TAX_MAX}
          defaultValue={params.taxRate ?? 0.19}
          onBlur={(e) => {
            const raw = e.currentTarget.value;
            if (raw === "") {
              e.currentTarget.value = String(params.taxRate ?? 0.19);
              return;
            }
            const parsed = Number(raw);
            if (Number.isNaN(parsed)) {
              e.currentTarget.value = String(params.taxRate ?? 0.19);
              return;
            }
            const clamped = clamp(parsed, TAX_MIN, TAX_MAX);
            update({ taxRate: clamped });
            e.currentTarget.value = String(clamped);
          }}
          style={{ marginLeft: 8 }}
        />
      </label>
    </div>
  );
}
