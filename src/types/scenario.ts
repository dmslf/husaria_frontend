// src/types/scenario.ts
export interface ComputedOutputs {
  grossProfit?: number;
  ebit?: number;
  [key: string]: any;
}

export interface ScenarioYear {
  raw?: { IS?: Record<string, any>; BS?: Record<string, any>; CF?: Record<string, any> };
  inputs: Record<string, number | null>;
  outputs?: Record<string, number | null>;
}

export type Scenario = Record<string, ScenarioYear>;

// LineDefs
export type LineKind = 'artifact' | 'editable' | 'calculated';
export type LineCategory = 'IS' | 'BS' | 'CF' | 'OTHER';

export interface LineControl {
  param: string;        // klucz w ForecastParams, np. "cogsPct"
  type?: "pct" | "growth";
  min?: number;         // UI min (np. 0)
  max?: number;         // UI max (np. 100 lub 200 dla net debt)
  help?: string;        // krótki tekst pod suwakiem
}

export interface LineDef {
  id: string;
  label: string;
  source: 'inputs' | 'outputs';
  kind: LineKind;
  category?: LineCategory;
  unit?: string;
  showControl?: boolean;
  control?: LineControl; // <- nowa opcja
}

// central list of lines
// src/types/scenario.ts

export const LINE_DEFS: LineDef[] = [
  // =====================
  // INCOME STATEMENT
  // =====================
  {
    id: "revenues",
    label: "Przychody",
    source: "inputs",
    kind: "editable",  // kontrolowane globalnie przez growth, ale widoczne w tabeli
    category: "IS",
    unit: "PLN",
  },

  {
    id: "cogs",
    label: "Koszt własny sprzedaży (COGS)",
    source: "inputs",
    kind: "editable",
    category: "IS",
    unit: "PLN",
    showControl: true,
    control: {
      param: "cogsPct",
      type: "pct",
      min: 50,
      max: 100,
      help: "% przychodów",
    },
  },

  {
    id: "grossProfit",
    label: "Zysk brutto",
    source: "outputs",
    kind: "calculated",
    category: "IS",
    unit: "PLN",
  },

  {
    id: "sgna",
    label: "Koszty operacyjne SG&A",
    source: "inputs",
    kind: "editable",
    category: "IS",
    unit: "PLN",
    showControl: true,
    control: {
      param: "sgnaPct",
      type: "pct",
      min: 0,
      max: 25,
      help: "% przychodów",
    },
  },



  {
    id: "ebit",
    label: "EBIT",
    source: "outputs",
    kind: "calculated",
    category: "IS",
    unit: "PLN",
  },

  {
    id: "financial_expense",
    label: "Koszty odsetek",
    source: "inputs",
    kind: "calculated", // liczone: prevNetDebt * interestRate
    category: "IS",
    unit: "PLN",
  },

  {
    id: "net_income",
    label: "Zysk netto",
    source: "outputs",
    kind: "calculated",
    category: "IS",
    unit: "PLN",
  },

  // =====================
  // BALANCE SHEET
  // =====================

  {
    id: "ppe",
    label: "PPE",
    source: "inputs",
    kind: "artifact", // zawsze liczone: PPE_prev + capex - depr
    category: "BS",
    unit: "PLN",
  },

  {
    id: "receivables",
    label: "Należności",
    source: "inputs",
    kind: "editable",
    category: "BS",
    unit: "PLN",
    showControl: true,
    control: {
      param: "receivablesPct",
      type: "pct",
      min: 0,
      max: 50,
      help: "% przychodów",
    },
  },

  {
    id: "inventory",
    label: "Zapasy",
    source: "inputs",
    kind: "editable",
    category: "BS",
    unit: "PLN",
    showControl: true,
    control: {
      param: "inventoryPct",
      type: "pct",
      min: 0,
      max: 50,
      help: "% przychodów",
    },
  },

  {
    id: "payables",
    label: "Zobowiązania krótkoterminowe",
    source: "inputs",
    kind: "editable",
    category: "BS",
    unit: "PLN",
    showControl: true,
    control: {
      param: "payablesPct",
      type: "pct",
      min: 0,
      max: 50,
      help: "% przychodów",
    },
  },

  {
    id: "cash",
    label: "Gotówka",
    source: "inputs",
    kind: "artifact",
    category: "BS",
    unit: "PLN",
  },

  {
    id: "debt",
    label: "Dług",
    source: "inputs",
    kind: "calculated", // nie edytujemy ręcznie
    category: "BS",
    unit: "PLN",
  },

  // =====================
  // CASH FLOW
  // =====================

  {
    id: "capex",
    label: "Capex",
    source: "inputs",
    kind: "editable",
    category: "CF",
    unit: "PLN",
    showControl: true,
    control: {
      param: "capexPct",
      type: "pct",
      min: 0,
      max: 50,
      help: "% przychodów",
    },

  },

    {
    id: "depr",
    label: "Amortyzacja",
    source: "inputs",
    kind: "editable",
    category: "CF",
    unit: "PLN",
    showControl: true,
    control: {
      param: "deprOnPpePct",
      type: "pct",
      min: 0,
      max: 30,
      help: "% poprzedniego PPE",
    },
  },

  {
    id: "dNWC",
    label: "Zmiana w kapitale obrotowym",
    source: "outputs",
    kind: "calculated",
    category: "CF",
    unit: "PLN",
  },


  {
    id: "operating_cf",
    label: "Operating CF",
    source: "outputs",
    kind: "calculated",
    category: "CF",
    unit: "PLN",
  },

  {
    id: "fcff",
    label: "FCFF",
    source: "outputs",
    kind: "calculated",
    category: "CF",
    unit: "PLN",
  },
];
