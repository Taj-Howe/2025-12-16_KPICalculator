import { kpiInputSchema } from "./schema";
import {
  annualizedProfit,
  annualizedRevenue,
  arpc,
  averageActiveCustomers,
  cac,
  churnRate,
  churnedFromStart,
  ltgpPerCustomer,
  ltvSubscription,
  ltvTransactional,
  ratioLtgpToCac,
  transactionalChurnRate,
} from "./formulas";
import type { KPIInput, KPIResult } from "./types";

export type KpiEvaluation = {
  inputs: KPIInput;
  results: KPIResult;
  warnings: string[];
};

type ModelMetrics = {
  churnRate: number | null;
  retentionRate: number | null;
  ltv: number | null;
  ltgpPerCustomer: number | null;
};

const nullMetrics: ModelMetrics = {
  churnRate: null,
  retentionRate: null,
  ltv: null,
  ltgpPerCustomer: null,
};

export const evaluateKpis = (payload: unknown): KpiEvaluation => {
  const parsed = kpiInputSchema.parse(payload) as KPIInput;
  const warnings: string[] = [];

  const endCustomers =
    parsed.activeCustomersEnd != null
      ? parsed.activeCustomersEnd
      : parsed.activeCustomersStart;
  const avgCustomers = averageActiveCustomers(
    parsed.activeCustomersStart,
    endCustomers,
  );
  if (parsed.activeCustomersEnd == null) {
    warnings.push(
      "Active customers at end not provided; ARPC uses start customers as an approximation.",
    );
  }
  const arpcValue = arpc(parsed.revenuePerPeriod, avgCustomers);
  const cacValue = cac(parsed.marketingSpendPerPeriod, parsed.newCustomersPerPeriod);

  const subscriptionMetrics = (missingMessage: string): ModelMetrics => {
    const retained = parsed.retainedCustomersFromStartAtEnd;
    const churned = parsed.churnedCustomersPerPeriod;

    let derivedChurned: number | null = null;
    if (retained != null) {
      derivedChurned = churnedFromStart(parsed.activeCustomersStart, retained);
    } else if (churned != null) {
      derivedChurned = churned;
    } else {
      warnings.push(missingMessage);
    }

    const churn = churnRate(derivedChurned ?? undefined, parsed.activeCustomersStart);
    const retention = churn == null ? null : 1 - churn;
    const ltv = ltvSubscription(arpcValue, parsed.grossMargin, churn);
    const ltgp = ltgpPerCustomer(ltv);

    if (retained != null && parsed.activeCustomersEnd != null) {
      const derivedNew = parsed.activeCustomersEnd - retained;
      if (parsed.newCustomersPerPeriod > 0) {
        const diff =
          Math.abs(derivedNew - parsed.newCustomersPerPeriod) /
          parsed.newCustomersPerPeriod;
        if (diff > 0.1) {
          warnings.push(
            `Subscription: derived new customers (${derivedNew}) differs from input (${parsed.newCustomersPerPeriod}).`,
          );
        }
      } else if (derivedNew > 0) {
        warnings.push(
          `Subscription: derived new customers (${derivedNew}) but input newCustomersPerPeriod is 0.`,
        );
      }
    }

    if (churn != null && churn < 0.005) {
      warnings.push("Churn is very low; LTV may be inflated.");
    }

    return {
      churnRate: churn,
      retentionRate: retention,
      ltv,
      ltgpPerCustomer: ltgp,
    };
  };

  const transactionalMetrics = (missingMessage: string): ModelMetrics => {
    const retention = parsed.retentionRatePerPeriod;
    if (retention == null) {
      warnings.push(missingMessage);
      return nullMetrics;
    }

    if (retention > 0.98) {
      warnings.push("Retention is very high; LTV may be inflated.");
    }

    const churn = transactionalChurnRate(retention);
    const ltv = ltvTransactional(arpcValue, parsed.grossMargin, retention);
    const ltgp = ltgpPerCustomer(ltv);

    return {
      churnRate: churn,
      retentionRate: retention,
      ltv,
      ltgpPerCustomer: ltgp,
    };
  };

  let modelMetrics: ModelMetrics = nullMetrics;

  if (parsed.businessModel === "subscription") {
    modelMetrics = subscriptionMetrics(
      "Subscription model requires retained-from-start count to compute churn.",
    );
  } else if (parsed.businessModel === "transactional") {
    modelMetrics = transactionalMetrics(
      "Transactional model requires retention rate per period.",
    );
  } else {
    const sub = subscriptionMetrics(
      "Hybrid: subscription retention missing; subscription churn not computed.",
    );
    const tx = transactionalMetrics(
      "Hybrid: transactional retention missing; transactional churn not computed.",
    );
    modelMetrics = sub.churnRate != null || sub.retentionRate != null ? sub : tx;
    if (
      (sub.churnRate == null && sub.retentionRate == null) &&
      (tx.churnRate == null && tx.retentionRate == null)
    ) {
      modelMetrics = nullMetrics;
    }
  }

  const ratio = ratioLtgpToCac(modelMetrics.ltgpPerCustomer, cacValue);

  const results: KPIResult = {
    cac: cacValue,
    arpc: arpcValue,
    churnRate: modelMetrics.churnRate,
    retentionRate: modelMetrics.retentionRate,
    ltv: modelMetrics.ltv,
    ltgpPerCustomer: modelMetrics.ltgpPerCustomer,
    ltgpToCacRatio: ratio,
    growthAssessment: ratio,
    hypotheticalMaxRevenuePerYear: annualizedRevenue(
      parsed.revenuePerPeriod,
      parsed.period,
    ),
    hypotheticalMaxProfitPerYear: annualizedProfit(
      parsed.revenuePerPeriod,
      parsed.grossMargin,
      parsed.marketingSpendPerPeriod,
      parsed.period,
    ),
    car: parsed.newCustomersPerPeriod,
  };

  if (cacValue == null) {
    warnings.push("CAC cannot be computed (newCustomersPerPeriod is 0).");
  }

  if (results.ltgpPerCustomer != null && results.ltgpToCacRatio == null) {
    warnings.push("LTGP:CAC cannot be computed (CAC is 0).");
  }

  return { inputs: parsed, results, warnings };
};
