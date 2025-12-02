// src/components/PercentControl.tsx
import React from "react";

type Props = {
  value: number; // UI value 0..100
  min?: number;
  max?: number;
  onImmediate?: (v: number) => void; // called when slider moves
  onCommit?: (v: number) => void; // called on blur (final commit)
  widthSlider?: number;
  widthInput?: number;
};

export default function PercentControl({
  value,
  min = 0,
  max = 100,
  onImmediate,
  onCommit,
  widthSlider = 120,
  widthInput = 60,
}: Props) {
  // local editing state as string so user can delete content
  const [local, setLocal] = React.useState<string>(String(Math.round(value)));

  // sync when parent value changes (but avoid clobbering while editing same value)
  React.useEffect(() => {
    // only sync if input is not focused OR differs meaningfully
    setLocal(String(Math.round(value)));
  }, [value]);

  const clamp = (n: number) => Math.min(Math.max(Math.round(n), min), max);

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setLocal(String(Math.round(v)));
    onImmediate?.(clamp(v));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // allow empty string so user can delete
    if (raw === "") {
      setLocal("");
      return;
    }
    // allow `-` while editing? we can ignore negatives by clamping later
    // parse numeric value
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      setLocal(raw);
      // immediate feedback is optional; here we call onImmediate only for numeric values
      onImmediate?.(clamp(parsed));
    } else {
      // keep raw (non-numeric) so user can paste etc.
      setLocal(raw);
    }
  };

  const handleBlur = () => {
    if (local === "") {
      // interpret empty as min (or you could choose to not commit)
      onCommit?.(min);
      setLocal(String(min));
      return;
    }
    const parsed = Number(local);
    if (Number.isNaN(parsed)) {
      // fallback to current value
      onCommit?.(value);
      setLocal(String(Math.round(value)));
      return;
    }
    const clamped = clamp(parsed);
    onCommit?.(clamped);
    setLocal(String(Math.round(clamped)));
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type="range"
        min={min}
        max={max}
        value={local === "" ? min : Number(local)}
        onChange={handleRangeChange}
        style={{ width: widthSlider }}
      />
      <input
        type="number"
        min={min}
        max={max}
        value={local}
        onChange={handleInputChange}
        onBlur={handleBlur}
        style={{ width: widthInput }}
      />
      <span style={{ color: "#666", fontSize: 12 }}>%</span>
    </div>
  );
}
