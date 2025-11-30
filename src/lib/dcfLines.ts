// src/config/dcfLines.ts
export const DCFLines = {
  requiredInputs: ["revenues","cogs","sgna","depr","capex","receivables","inventory","payables","debt","cash"],
  calcOrder: ["grossProfit","ebit","noplat","fcf"],
  // opcjonalnie: funkcje calcuateGrossProfit, calculateEBIT etc.
};
