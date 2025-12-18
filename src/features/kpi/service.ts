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

type SubscriptionDerived = {
  churnRate: number | null;
  retentionRate: number | null;
  derivedEndCustomers: number | null;
  hasData: boolean;
};

type TransactionalDerived = {
  churnRate: number | null;
  retentionRate: number | null;
  hasData: boolean;
};

const nullSubscriptionDerived: SubscriptionDerived = {
  churnRate: null,
  retentionRate: null,
  derivedEndCustomers: null,
  hasData: false,
};

const nullTransactionalDerived: TransactionalDerived = {
  churnRate: null,
  retentionRate: null,
  hasData: false,
};

export const evaluateKpis = (payload: unknown): KpiEvaluation => {
  const parsed = kpiInputSchema.parse(payload) as KPIInput;
  const warnings: string[] = [];

  const subscriptionDerived =
    parsed.businessModel === "subscription"
      ? getSubscriptionDerived(
          parsed,
          warnings,
          "Provide either churned customers or retained-from-start to compute churn.",
        )
      : parsed.businessModel === "hybrid"
        ? getSubscriptionDerived(
            parsed,
            warnings,
            "Hybrid: subscription retention missing; subscription churn not computed.",
          )
        : nullSubscriptionDerived;

  const transactionalDerived =
    parsed.businessModel === "transactional"
      ? getTransactionalDerived(
          parsed,
          warnings,
          "Transactional model requires retention rate per period.",
        )
      : parsed.businessModel === "hybrid"
        ? getTransactionalDerived(
            parsed,
            warnings,
            "Hybrid: transactional retention missing; transactional churn not computed.",
          )
        : nullTransactionalDerived;

  let avgCustomers: number | null = null;
  if (parsed.businessModel === "subscription") {
    let derivedEndCustomers = subscriptionDerived.derivedEndCustomers;
    if (derivedEndCustomers != null && derivedEndCustomers < 0) {
      warnings.push(
        "Derived end customers is negative; check start, new, and churn inputs.",
      );
      derivedEndCustomers = null;
    }
    avgCustomers =
      derivedEndCustomers != null
        ? averageActiveCustomers(parsed.activeCustomersStart, derivedEndCustomers)
        : parsed.activeCustomersStart;
  } else {
    const providedEnd = parsed.activeCustomersEnd ?? null;
    if (providedEnd == null) {
      warnings.push(
        "Active customers at end is required to compute ARPC for this business model.",
      );
    } else {
      avgCustomers = averageActiveCustomers(parsed.activeCustomersStart, providedEnd);
    }
  }

  const arpcValue =
    avgCustomers != null ? arpc(parsed.revenuePerPeriod, avgCustomers) : null;
  const cacValue = cac(parsed.marketingSpendPerPeriod, parsed.newCustomersPerPeriod);
  const grossProfitPerCustomer =
    arpcValue != null ? arpcValue * parsed.grossMargin : null;
  const cacPaybackPeriods =
    cacValue != null && grossProfitPerCustomer != null && grossProfitPerCustomer > 0
      ? cacValue / grossProfitPerCustomer
      : null;

  if (cacPaybackPeriods != null && cacPaybackPeriods > 12) {
    warnings.push("Payback is long; growth may be cash constrained.");
  }

  let modelMetrics: ModelMetrics = nullMetrics;
  if (parsed.businessModel === "subscription") {
    modelMetrics = finalizeSubscriptionMetrics(subscriptionDerived, arpcValue, parsed.grossMargin);
  } else if (parsed.businessModel === "transactional") {
    modelMetrics = finalizeTransactionalMetrics(
      transactionalDerived,
      arpcValue,
      parsed.grossMargin,
    );
  } else {
    const subMetrics = finalizeSubscriptionMetrics(
      subscriptionDerived,
      arpcValue,
      parsed.grossMargin,
    );
    const txMetrics = finalizeTransactionalMetrics(
      transactionalDerived,
      arpcValue,
      parsed.grossMargin,
    );
    modelMetrics =
      subMetrics.churnRate != null || subMetrics.retentionRate != null ? subMetrics : txMetrics;
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
    cacPaybackPeriods,
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

const finalizeSubscriptionMetrics = (
  derived: SubscriptionDerived,
  arpcValue: number | null,
  grossMargin: number,
): ModelMetrics => {
  if (!derived.hasData) {
    return nullMetrics;
  }

  const ltv = ltvSubscription(arpcValue, grossMargin, derived.churnRate);
  return {
    churnRate: derived.churnRate,
    retentionRate: derived.retentionRate,
    ltv,
    ltgpPerCustomer: ltgpPerCustomer(ltv),
  };
};

const finalizeTransactionalMetrics = (
  derived: TransactionalDerived,
  arpcValue: number | null,
  grossMargin: number,
): ModelMetrics => {
  if (!derived.hasData) {
    return nullMetrics;
  }

  const ltv = ltvTransactional(arpcValue, grossMargin, derived.retentionRate ?? undefined);
  return {
    churnRate: derived.churnRate,
    retentionRate: derived.retentionRate,
    ltv,
    ltgpPerCustomer: ltgpPerCustomer(ltv),
  };
};

const getSubscriptionDerived = (
  parsed: KPIInput,
  warnings: string[],
  missingMessage: string,
): SubscriptionDerived => {
  const start = parsed.activeCustomersStart;
  const retained = parsed.retainedCustomersFromStartAtEnd;
  const churnedInput = parsed.churnedCustomersPerPeriod;

  let derivedChurned: number | null = null;
  if (retained != null) {
    derivedChurned = churnedFromStart(start, retained);
  } else if (churnedInput != null) {
    derivedChurned = churnedInput;
  } else {
    warnings.push(missingMessage);
    return nullSubscriptionDerived;
  }

  const churn = churnRate(derivedChurned ?? undefined, start);
  if (churn != null && churn < 0.005) {
    warnings.push("Churn is very low; LTV may be inflated.");
  }
  const retention = churn == null ? null : 1 - churn;

  let derivedEndCustomers: number | null = null;
  if (derivedChurned != null) {
    derivedEndCustomers = start + parsed.newCustomersPerPeriod - derivedChurned;
  }

  return {
    churnRate: churn,
    retentionRate: retention,
    derivedEndCustomers,
    hasData: true,
  };
};

const getTransactionalDerived = (
  parsed: KPIInput,
  warnings: string[],
  missingMessage: string,
): TransactionalDerived => {
  const retention = parsed.retentionRatePerPeriod;
  if (retention == null) {
    warnings.push(missingMessage);
    return nullTransactionalDerived;
  }

  if (retention > 0.98) {
    warnings.push("Retention is very high; LTV may be inflated.");
  }

  const churn = transactionalChurnRate(retention);

  return {
    churnRate: churn,
    retentionRate: retention,
    hasData: true,
  };
};
