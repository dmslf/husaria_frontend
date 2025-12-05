import React from "react";

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return "-";
  const num = Number(n);
  if (Number.isNaN(num)) return "-";
  // zaokrąglamy do pełnych złotych i format PL
  return Math.round(num).toLocaleString("pl-PL");
}

export type DCFYearRow = {
  year: string;
  unleveredFCF?: number | null;
  discountFactor?: number | null;
  pvOfFCF?: number | null;
};

export type DCFResults = {
  years?: string[]; // ordered years shown in the scenario, e.g. ["2023","2024","2025",...]
  yearRows?: DCFYearRow[]; // one per displayed year
  terminalValue?: number | null; // nominal terminal value (undiscounted or discounted depending on your calc)
  terminalValueDiscounted?: number | null; // PV of terminal value (recommended)
  sumPVofFCF?: number | null; // suma zdyskontowanych przepływów (PV)
  enterpriseValue?: number | null; // EV = sumPVofFCF + PV(terminal)
  netDebt?: number | null; // dług netto (debt - cash)
  equityValue?: number | null; // enterpriseValue - netDebt
  sharesOutstanding?: number | null; // liczba akcji (optional)
  impliedPricePerShare?: number | null; // equityValue / sharesOutstanding (optional)
  assumptions?: Record<string, string | number> | null; // krótkie podsumowanie założeń (np. terminal growth, WACC)
};

export default function DCFResultsTable({
  dcf,
  onClose,
}: {
  dcf: DCFResults | null;
  onClose?: () => void;
}) {
  if (!dcf) return <div>Brak wyników DCF do wyświetlenia</div>;

  const years = dcf.years ?? (dcf.yearRows ?? []).map((r) => r.year);
  const yearRows = dcf.yearRows ?? [];

  const sectionHeaderStyle: React.CSSProperties = {
    background: "#f0f4ff",
    fontWeight: 700,
    padding: "8px 6px",
  };
  const rowLabelStyle: React.CSSProperties = { padding: 6, fontWeight: 500 };
  const cellStyle: React.CSSProperties = { padding: 6, textAlign: "right", minWidth: 120 };

  return (
    <div style={{ padding: 12, marginTop: 12, position: "relative", border: "1px solid #e6e6e6", borderRadius: 6 }}>
      {/* Close "X" button in top-right */}
      <button
        onClick={() => onClose && onClose()}
        aria-label="Zamknij tabelę DCF"
        title="Zamknij"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          padding: "4px 6px",
        }}
      >
        ×
      </button>

      <h3 style={{ marginTop: 0 }}>Rezultaty DCF</h3>

      <table style={{ borderCollapse: "collapse", width: "100%" }} border={1}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: 6 }}>Pozycja \ Rok</th>
            {years.map((y) => (
              <th key={y} style={{ padding: 6, textAlign: "right" }}>
                {y}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Section: Cash flows */}
          <tr>
            <td colSpan={years.length + 1} style={sectionHeaderStyle}>
              Przepływy i dyskontowanie
            </td>
          </tr>

          <tr>
            <td style={rowLabelStyle}>Unlevered Free Cash Flow</td>
            {years.map((y) => {
              const row = yearRows.find((r) => r.year === y);
              return (
                <td key={`fcf-${y}`} style={cellStyle}>
                  {fmt(row?.unleveredFCF)}
                </td>
              );
            })}
          </tr>

          <tr>
            <td style={rowLabelStyle}>Discount factor</td>
            {years.map((y) => {
              const row = yearRows.find((r) => r.year === y);
              return (
                <td key={`df-${y}`} style={cellStyle}>
                  {row?.discountFactor == null ? "-" : (Math.round((row.discountFactor ?? 0) * 10000) / 100).toLocaleString("pl-PL") + " %"}
                </td>
              );
            })}
          </tr>

          <tr>
            <td style={rowLabelStyle}>PV of FCF</td>
            {years.map((y) => {
              const row = yearRows.find((r) => r.year === y);
              return (
                <td key={`pv-${y}`} style={cellStyle}>
                  {fmt(row?.pvOfFCF)}
                </td>
              );
            })}
          </tr>

          <tr>
            <td colSpan={years.length + 1} style={sectionHeaderStyle}>
              Wycena akcji
            </td>
          </tr>

                    <tr>
            <td style={rowLabelStyle}>Wartość kapitału własnego (Equity Value)</td>
            <td style={cellStyle} colSpan={years.length}>
              {fmt(dcf.equityValue)}
            </td>
          </tr>

          <tr>
            <td style={rowLabelStyle}>Liczba akcji (shares outstanding)</td>
            <td style={cellStyle} colSpan={years.length}>
              {dcf.sharesOutstanding ? dcf.sharesOutstanding.toLocaleString("pl-PL") : "-"}
            </td>
          </tr>

          <tr>
            <td style={rowLabelStyle}>Cena za akcję</td>
            <td style={cellStyle} colSpan={years.length}>
              {dcf.impliedPricePerShare ? (Math.round(dcf.impliedPricePerShare * 100) / 100).toLocaleString("pl-PL") : "-"}
            </td>
          </tr>

          {/* Section: terminal + aggregation */}
          <tr>
            <td colSpan={years.length + 1} style={sectionHeaderStyle}>
              Wartości końcowe
            </td>
          </tr>

          <tr>
            <td style={rowLabelStyle}>Suma zdyskontowanych FCF (PV)</td>
            <td style={cellStyle} colSpan={years.length}>
              {fmt(dcf.sumPVofFCF)}
            </td>
          </tr>

          <tr>
            <td style={rowLabelStyle}>Wartość terminalna (nominalna)</td>
            <td style={cellStyle} colSpan={years.length}>
              {fmt(dcf.terminalValue)}
            </td>
          </tr>

          <tr>
            <td style={rowLabelStyle}>PV wartości terminalnej</td>
            <td style={cellStyle} colSpan={years.length}>
              {fmt(dcf.terminalValueDiscounted)}
            </td>
          </tr>

          <tr>
            <td style={rowLabelStyle}>Enterprise Value (EV)</td>
            <td style={cellStyle} colSpan={years.length}>
              {fmt(dcf.enterpriseValue)}
            </td>
          </tr>

          <tr>
            <td style={rowLabelStyle}>Dług netto (Net Debt)</td>
            <td style={cellStyle} colSpan={years.length}>
              {fmt(dcf.netDebt)}
            </td>
          </tr>


        </tbody>
      </table>
    </div>
  );
}
