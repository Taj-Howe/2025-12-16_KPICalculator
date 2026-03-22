import {
  annualizedRevenue,
  averageActiveCustomers,
  cac,
  churnRate,
  churnedFromStart,
  periodsPerYear,
} from "./formulas";
import type { CacInputMode, KpiPeriod, RetentionInputMode } from "./types";

export type DerivedAcquisitionModel = {
  mode: CacInputMode;
  acquisitionSpendPerPeriod: number;
  cacPerNewCustomer: number | null;
};

export const deriveAcquisitionModel = ({
  newCustomersPerPeriod,
  cacInputMode,
  marketingSpendPerPeriod,
  directCac,
}: {
  newCustomersPerPeriod: number;
  cacInputMode?: CacInputMode;
  marketingSpendPerPeriod?: number;
  directCac?: number;
}): DerivedAcquisitionModel => {
  const mode = cacInputMode ?? "derived";
  const acquisitionSpendPerPeriod =
    mode === "direct" && directCac != null
      ? directCac * newCustomersPerPeriod
      : marketingSpendPerPeriod ?? 0;
  const cacPerNewCustomer =
    mode === "direct"
      ? directCac ?? null
      : cac(acquisitionSpendPerPeriod, newCustomersPerPeriod);

  return {
    mode,
    acquisitionSpendPerPeriod,
    cacPerNewCustomer,
  };
};

export type RecurringRetentionModel = {
  assumptionsApplied: string[];
  warnings: string[];
  churnValue: number | null;
  retentionValue: number | null;
  derivedEndCustomers: number | null;
  averageCustomers: number | null;
};

export const buildRecurringRetentionModel = ({
  retentionSubject,
  activeCustomersStart,
  newCustomersPerPeriod,
  retentionInputMode,
  directChurnRatePerPeriod,
  churnedCustomersPerPeriod,
  retainedCustomersFromStartAtEnd,
}: {
  retentionSubject: string;
  activeCustomersStart: number;
  newCustomersPerPeriod: number;
  retentionInputMode?: RetentionInputMode;
  directChurnRatePerPeriod?: number;
  churnedCustomersPerPeriod?: number;
  retainedCustomersFromStartAtEnd?: number;
}): RecurringRetentionModel => {
  const assumptionsApplied: string[] = [];
  const warnings: string[] = [];
  const mode = retentionInputMode ?? "counts";

  const derivedChurned =
    mode === "rate"
      ? directChurnRatePerPeriod != null
        ? activeCustomersStart * directChurnRatePerPeriod
        : null
      : retainedCustomersFromStartAtEnd != null
        ? churnedFromStart(activeCustomersStart, retainedCustomersFromStartAtEnd)
        : churnedCustomersPerPeriod ?? null;

  const churnValue =
    mode === "rate"
      ? directChurnRatePerPeriod ?? null
      : churnRate(derivedChurned ?? undefined, activeCustomersStart);
  const retentionValue = churnValue == null ? null : 1 - churnValue;
  const derivedEndCustomers =
    derivedChurned != null
      ? activeCustomersStart + newCustomersPerPeriod - derivedChurned
      : null;
  const averageCustomers =
    derivedEndCustomers != null
      ? averageActiveCustomers(activeCustomersStart, derivedEndCustomers)
      : activeCustomersStart;

  if (mode === "rate") {
    assumptionsApplied.push(`Used direct churn rate for ${retentionSubject} retention.`);
    assumptionsApplied.push(
      "Derived churned customers from activeCustomersStart * churn rate.",
    );
  } else if (retainedCustomersFromStartAtEnd != null) {
    assumptionsApplied.push(
      "Derived churned customers from retainedCustomersFromStartAtEnd.",
    );
  } else {
    assumptionsApplied.push("Used provided churnedCustomersPerPeriod.");
  }

  if (derivedEndCustomers != null) {
    assumptionsApplied.push("Derived end customers as start + new - churned.");
  }

  if (derivedEndCustomers != null && derivedEndCustomers < 0) {
    warnings.push(
      "Derived end customers is negative; check start, new, and churn inputs.",
    );
  }

  if (churnValue != null && churnValue < 0.005) {
    warnings.push("Churn is very low; LTV may be inflated.");
  }

  return {
    assumptionsApplied,
    warnings,
    churnValue,
    retentionValue,
    derivedEndCustomers,
    averageCustomers,
  };
};

export type RecurringForecastSummary = {
  hypotheticalMaxCustomers: number | null;
  hypotheticalMaxRevenuePerYear: number | null;
  hypotheticalMaxProfitPerYear: number | null;
  projectedRevenueNextYear: number | null;
  projectedProfitNextYear: number | null;
};

export const buildRecurringForecastSummary = ({
  analysisPeriod,
  activeCustomersStart,
  newCustomersPerPeriod,
  churnRatePerPeriod,
  arpcPerActiveCustomerPerPeriod,
  grossProfitPerActiveCustomerPerPeriod,
  acquisitionSpendPerPeriod,
}: {
  analysisPeriod: KpiPeriod;
  activeCustomersStart: number;
  newCustomersPerPeriod: number;
  churnRatePerPeriod: number | null;
  arpcPerActiveCustomerPerPeriod: number | null;
  grossProfitPerActiveCustomerPerPeriod: number | null;
  acquisitionSpendPerPeriod: number;
}): RecurringForecastSummary => {
  const hypotheticalMaxCustomers =
    churnRatePerPeriod != null && churnRatePerPeriod > 0
      ? newCustomersPerPeriod / churnRatePerPeriod
      : null;
  const hypotheticalMaxRevenuePerYear =
    hypotheticalMaxCustomers != null && arpcPerActiveCustomerPerPeriod != null
      ? annualizedRevenue(
          hypotheticalMaxCustomers * arpcPerActiveCustomerPerPeriod,
          analysisPeriod,
        )
      : null;
  const hypotheticalMaxProfitPerYear =
    hypotheticalMaxCustomers != null &&
    grossProfitPerActiveCustomerPerPeriod != null
      ? annualizedRevenue(
          hypotheticalMaxCustomers * grossProfitPerActiveCustomerPerPeriod,
          analysisPeriod,
        )
      : null;

  if (arpcPerActiveCustomerPerPeriod == null || churnRatePerPeriod == null) {
    return {
      hypotheticalMaxCustomers,
      hypotheticalMaxRevenuePerYear,
      hypotheticalMaxProfitPerYear,
      projectedRevenueNextYear: null,
      projectedProfitNextYear: null,
    };
  }

  const totalSteps = periodsPerYear(analysisPeriod);
  let activeCustomers = Math.max(activeCustomersStart, 0);
  let totalRevenue = 0;
  let totalProfit: number | null = 0;

  for (let step = 1; step <= totalSteps; step += 1) {
    const churnedCustomers = activeCustomers * churnRatePerPeriod;
    const endCustomers = activeCustomers + newCustomersPerPeriod - churnedCustomers;
    const averageCustomers = averageActiveCustomers(activeCustomers, endCustomers);
    const revenue = arpcPerActiveCustomerPerPeriod * averageCustomers;
    const grossProfit =
      grossProfitPerActiveCustomerPerPeriod == null
        ? null
        : grossProfitPerActiveCustomerPerPeriod * averageCustomers;
    const profit =
      grossProfit == null ? null : grossProfit - acquisitionSpendPerPeriod;

    totalRevenue += revenue;
    totalProfit = totalProfit == null || profit == null ? null : totalProfit + profit;
    activeCustomers = endCustomers;
  }

  return {
    hypotheticalMaxCustomers,
    hypotheticalMaxRevenuePerYear,
    hypotheticalMaxProfitPerYear,
    projectedRevenueNextYear: totalRevenue,
    projectedProfitNextYear: totalProfit,
  };
};
