import { kpiInputSchema } from "./schema";
import { calculateMetrics } from "./formulas";
import type { KPIInput, KPIResult } from "./types";

export type KpiEvaluation = {
  inputs: KPIInput;
  results: KPIResult;
  warnings: string[];
};

export const evaluateKpis = (payload: unknown): KpiEvaluation => {
  const parsed = kpiInputSchema.parse(payload) as KPIInput;
  const warnings: string[] = [];

  if (parsed.businessModel === "hybrid") {
    if (parsed.churnedCustomersPerPeriod == null) {
      warnings.push("Hybrid model: churnedCustomersPerPeriod missing.");
    }
    if (parsed.retentionRatePerPeriod == null) {
      warnings.push("Hybrid model: retentionRatePerPeriod missing.");
    }
  }

  const results = calculateMetrics(parsed);

  if (results.churnRate != null && results.churnRate < 0.005) {
    warnings.push("Churn is very low; LTV may be inflated.");
  }

  if (
    parsed.retentionRatePerPeriod != null &&
    parsed.retentionRatePerPeriod > 0.98
  ) {
    warnings.push("Retention is very high; LTV may be inflated.");
  }

  if (results.cac == null) {
    warnings.push("CAC cannot be computed (newCustomersPerPeriod is 0).");
  }

  if (results.ltgpPerCustomer != null && results.ltgpToCacRatio == null) {
    warnings.push("LTGP:CAC cannot be computed (CAC is 0).");
  }

  return { inputs: parsed, results, warnings };
};
