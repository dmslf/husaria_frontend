// src/components/CompanySelect.tsx
import { useEffect, useState } from "react";
import { getCompanies } from "../api/valuations";

export default function CompanySelect({ value, onChange }: { value: string | null; onChange: (s: string|null) => void }) {
  const [companies, setCompanies] = useState<{ symbol: string; name: string; shares_outstanding?: number | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cs = await getCompanies();
        if (!mounted) return;
        setCompanies(cs);
      } catch (e) {
        console.error("CompanySelect getCompanies error", e);
        setCompanies([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ marginRight: 8 }}>Spółka:</label>
      {loading ? <span>Ładowanie...</span> : (
        <select value={value ?? ""} onChange={e => onChange(e.target.value || null)}>
          <option value="">— wybierz spółkę —</option>
          {companies.map(c => (
            <option key={c.symbol} value={c.symbol}>
              {c.symbol} — {c.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
