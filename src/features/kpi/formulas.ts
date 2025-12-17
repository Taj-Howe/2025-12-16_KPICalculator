import type { KPIInput } from "./types";

export const periodsPerYear = (period: KPIInput["period"]): number => {
  switch (period) {
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "yearly":
      return 1;
    default:
      return 1;
  }
};

export const averageActiveCustomers = (
  start: number,
  end: number,
): number => {
  if (start === 0 && end === 0) {
    return 0;
  }
  return (start + end) / 2;
};

export const arpc = (
  revenuePerPeriod: number,
  avgActiveCustomers: number,
): number | null => {
  if (avgActiveCustomers <= 0) {
    return null;
  }
  return revenuePerPeriod / avgActiveCustomers;
};

export const cac = (
  marketingSpendPerPeriod: number,
  newCustomersPerPeriod: number,
): number | null => {
  if (newCustomersPerPeriod <= 0) {
    return null;
  }
  return marketingSpendPerPeriod / newCustomersPerPeriod;
};

export const churnRate = (
  churnedCustomersPerPeriod: number | undefined,
  activeCustomersStart: number,
): number | null => {
  if (
    churnedCustomersPerPeriod == null ||
    churnedCustomersPerPeriod < 0 ||
    activeCustomersStart <= 0
  ) {
    return null;
  }
  return churnedCustomersPerPeriod / activeCustomersStart;
};

export const churnedFromStart = (
  activeCustomersStart: number,
  retainedCustomersFromStartAtEnd: number | undefined,
): number | null => {
  if (
    activeCustomersStart <= 0 ||
    retainedCustomersFromStartAtEnd == null ||
    retainedCustomersFromStartAtEnd > activeCustomersStart
  ) {
    return null;
  }
  return activeCustomersStart - retainedCustomersFromStartAtEnd;
};

export const transactionalChurnRate = (
  retentionRatePerPeriod: number | undefined,
): number | null => {
  if (retentionRatePerPeriod == null) {
    return null;
  }
  return 1 - retentionRatePerPeriod;
};

export const ltvSubscription = (
  avgRevenuePerCustomer: number | null,
  grossMargin: number,
  churnRateValue: number | null,
): number | null => {
  if (
    avgRevenuePerCustomer == null ||
    churnRateValue == null ||
    churnRateValue <= 0
  ) {
    return null;
  }
  return (avgRevenuePerCustomer * grossMargin) / churnRateValue;
};

export const ltvTransactional = (
  avgRevenuePerCustomer: number | null,
  grossMargin: number,
  retentionRatePerPeriod: number | undefined,
): number | null => {
  if (
    avgRevenuePerCustomer == null ||
    retentionRatePerPeriod == null ||
    retentionRatePerPeriod >= 1
  ) {
    return null;
  }
  return (
    (avgRevenuePerCustomer * grossMargin) /
    (1 - retentionRatePerPeriod)
  );
};

export const ltgpPerCustomer = (
  ltv: number | null,
): number | null => {
  return ltv ?? null;
};

export const ratioLtgpToCac = (
  ltgp: number | null,
  cacValue: number | null,
): number | null => {
  if (ltgp == null || cacValue == null || cacValue <= 0) {
    return null;
  }
  return ltgp / cacValue;
};

export const annualizedRevenue = (
  revenuePerPeriod: number,
  period: KPIInput["period"],
): number => {
  return revenuePerPeriod * periodsPerYear(period);
};

export const annualizedProfit = (
  revenuePerPeriod: number,
  grossMargin: number,
  marketingSpendPerPeriod: number,
  period: KPIInput["period"],
): number => {
  const grossProfit = revenuePerPeriod * grossMargin;
  const netPerPeriod = grossProfit - marketingSpendPerPeriod;
  return netPerPeriod * periodsPerYear(period);
};
