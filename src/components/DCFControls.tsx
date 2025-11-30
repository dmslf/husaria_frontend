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

  return (
    <div style={{ marginBottom: 12, padding: 8, border: "1px solid #eee" }}>
      <h4>DCF controls</h4>
      <label>
        WACC (e.g. 0.09):
        <input type="number" step="0.001" value={params.wacc} onChange={e => update({ wacc: Number(e.target.value) })} />
      </label>
      <br />
      <label>
        Perpetual growth (e.g. 0.02):
        <input type="number" step="0.001" value={params.perpetualGrowth} onChange={e => update({ perpetualGrowth: Number(e.target.value) })} />
      </label>
      <br />
      <label>
        Tax rate (e.g. 0.19):
        <input type="number" step="0.001" value={params.taxRate ?? 0.19} onChange={e => update({ taxRate: Number(e.target.value) })} />
      </label>
    </div>
  );
}
