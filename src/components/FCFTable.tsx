// src/components/FCFTable.tsx
import { formatNumber } from '../utils/format';

interface Props {
  years: string[]; // labels
  fcf: number[];
}

export default function FCFTable({ years, fcf }: Props) {
  return (
    <table className="min-w-full border-collapse">
      <thead>
        <tr>
          <th>Rok</th>
          {years.map(y => <th key={y}>{y}</th>)}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>FCF</td>
          {fcf.map((v, i) => <td key={i}>{formatNumber(v, 0)}</td>)}
        </tr>
      </tbody>
    </table>
  );
}
