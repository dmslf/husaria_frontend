// src/hooks/useScenario.ts
import { useState, useEffect } from "react";
import type { Scenario } from "../types/scenario";
import { buildScenarioFromStatements, computeScenario } from "../utils/scenarioBuilder";
import type { ForecastParams, GlobalParams, ModelParams } from "../types/params";

export function useScenario(
  apiStatements: Record<string, any> | null,
  globalParams?: GlobalParams,
  forecastParams?: ForecastParams
) {
  const [raw, setRaw] = useState<Record<string, any> | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!apiStatements || Object.keys(apiStatements).length === 0) {
      setRaw(null);
      setScenario(null);
      return;
    }

    setLoading(true);
    try {
      const built = buildScenarioFromStatements(apiStatements);

      // merge params (global override first, then forecast overrides)
      const mergedParams: ModelParams = { ...(globalParams ?? {}), ...(forecastParams ?? {}) };

      const computed = computeScenario(built, mergedParams);
      setRaw(built);
      setScenario(computed);
    } catch (e) {
      console.error("useScenario build/compute error", e);
      setRaw(null);
      setScenario(null);
    } finally {
      setLoading(false);
    }
    // re-run when apiStatements or any params change
  }, [apiStatements, JSON.stringify(globalParams ?? {}), JSON.stringify(forecastParams ?? {})]);

  const years = scenario ? Object.keys(scenario).sort((a, b) => Number(a) - Number(b)) : [];
  const historicalYears = raw ? Object.keys(raw).sort((a, b) => Number(a) - Number(b)) : [];
  const lastHistoricalYear = historicalYears.length > 0 ? Number(historicalYears[historicalYears.length - 1]) : null;

  return { scenario, years, historicalYears, lastHistoricalYear, loading };
}
