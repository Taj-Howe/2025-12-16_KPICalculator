import {
  annualizedRevenue,
  arpc,
  averageActiveCustomers,
  cac,
  churnRate,
  churnedFromStart,
  periodsPerYear,
} from "./formulas";
import type { KpiPeriod, SubscriptionOfferInput } from "./types";

export type SubscriptionDerivedMetrics = {
  activeCustomersStart: number | null;
  derivedChurned: number | null;
  churnValue: number | null;
  derivedEndCustomers: number | null;
  avgCustomers: number | null;
  arpcValue: number | null;
  derivedMarketingSpend: number;
  cacValue: number | null;
  effectiveGrossMargin: number | null;
  grossProfitPerCustomer: number | null;
  currentRevenuePerPeriod: number | null;
  currentProfitPerPeriod: number | null;
};

export type SubscriptionForecastPoint = {
  step: number;
  endCustomers: number;
  averageCustomers: number;
  revenue: number;
  profit: number | null;
};

export type SubscriptionForecast = {
  current: {
    revenue: number | null;
    profit: number | null;
    customers: number;
  };
  points: SubscriptionForecastPoint[];
  totals: {
    revenue: number | null;
    profit: number | null;
  };
  steadyState: {
    customers: number | null;
    revenuePerPeriod: number | null;
    profitPerPeriod: number | null;
    revenuePerYear: number | null;
    profitPerYear: number | null;
  };
};

const deriveCurrentRevenuePerPeriod = (
  input: SubscriptionOfferInput,
  arpcValue: number | null,
  activeCustomersStart: number | null,
) => {
  if (input.revenueInputMode === "total_revenue") {
    return input.revenuePerPeriod ?? null;
  }
  if (arpcValue == null) {
    return null;
  }
  return arpcValue * Math.max(activeCustomersStart ?? 0, 0);
};

const deriveCurrentProfitPerPeriod = ({
  input,
  currentRevenuePerPeriod,
  activeCustomersStart,
  avgCustomers,
  derivedMarketingSpend,
  effectiveGrossMargin,
}: {
  input: SubscriptionOfferInput;
  currentRevenuePerPeriod: number | null;
  activeCustomersStart: number | null;
  avgCustomers: number | null;
  derivedMarketingSpend: number;
  effectiveGrossMargin: number | null;
}) => {
  if (currentRevenuePerPeriod == null) {
    return null;
  }

  if ((input.grossProfitInputMode ?? "margin") === "margin") {
    return effectiveGrossMargin != null
      ? currentRevenuePerPeriod * effectiveGrossMargin - derivedMarketingSpend
      : null;
  }

  const activeBase =
    input.revenueInputMode === "total_revenue"
      ? avgCustomers ?? activeCustomersStart ?? 0
      : activeCustomersStart ?? 0;

  return (
    currentRevenuePerPeriod -
    (input.deliveryCostPerCustomerPerPeriod ?? 0) * activeBase -
    (input.fixedDeliveryCostPerPeriod ?? 0) -
    derivedMarketingSpend
  );
};

export const deriveSubscriptionMetrics = (
  input: SubscriptionOfferInput,
): SubscriptionDerivedMetrics => {
  const revenueInputMode = input.revenueInputMode ?? "total_revenue";
  const grossProfitInputMode = input.grossProfitInputMode ?? "margin";
  const cacInputMode = input.cacInputMode ?? "derived";
  const retentionInputMode = input.retentionInputMode ?? "counts";
  const activeCustomersStart = input.activeCustomersStart ?? null;

  const derivedChurned =
    retentionInputMode === "rate"
      ? input.directChurnRatePerPeriod != null && activeCustomersStart != null
        ? activeCustomersStart * input.directChurnRatePerPeriod
        : null
      : input.retainedCustomersFromStartAtEnd != null
        ? churnedFromStart(
            activeCustomersStart ?? 0,
            input.retainedCustomersFromStartAtEnd,
          )
        : input.churnedCustomersPerPeriod ?? null;

  const churnValue =
    retentionInputMode === "rate"
      ? input.directChurnRatePerPeriod ?? null
      : churnRate(derivedChurned ?? undefined, activeCustomersStart ?? 0);

  const derivedEndCustomers =
    derivedChurned != null && activeCustomersStart != null
      ? activeCustomersStart + input.newCustomersPerPeriod - derivedChurned
      : null;

  const avgCustomers =
    activeCustomersStart == null
      ? null
      : derivedEndCustomers != null
        ? averageActiveCustomers(activeCustomersStart, derivedEndCustomers)
        : activeCustomersStart;

  const arpcValue =
    revenueInputMode === "direct_arpc"
      ? input.directArpc ?? null
      : input.revenuePerPeriod != null && avgCustomers != null
        ? arpc(input.revenuePerPeriod, avgCustomers)
        : null;

  const derivedMarketingSpend =
    cacInputMode === "direct" && input.directCac != null
      ? input.directCac * input.newCustomersPerPeriod
      : input.marketingSpendPerPeriod ?? 0;

  const cacValue =
    cacInputMode === "direct"
      ? input.directCac ?? null
      : cac(derivedMarketingSpend, input.newCustomersPerPeriod);

  let effectiveGrossMargin: number | null = null;
  let grossProfitPerCustomer: number | null = null;

  if (grossProfitInputMode === "margin") {
    effectiveGrossMargin = input.grossMargin ?? null;
    grossProfitPerCustomer =
      arpcValue != null && effectiveGrossMargin != null
        ? arpcValue * effectiveGrossMargin
        : null;
  } else if (arpcValue != null) {
    const variableCost = input.deliveryCostPerCustomerPerPeriod ?? 0;
    const fixedCostShare =
      avgCustomers != null && avgCustomers > 0
        ? (input.fixedDeliveryCostPerPeriod ?? 0) / avgCustomers
        : 0;
    grossProfitPerCustomer = arpcValue - variableCost - fixedCostShare;
    effectiveGrossMargin =
      arpcValue > 0 ? grossProfitPerCustomer / arpcValue : null;
  }

  const currentRevenuePerPeriod = deriveCurrentRevenuePerPeriod(
    input,
    arpcValue,
    activeCustomersStart,
  );

  const currentProfitPerPeriod = deriveCurrentProfitPerPeriod({
    input,
    currentRevenuePerPeriod,
    activeCustomersStart,
    avgCustomers,
    derivedMarketingSpend,
    effectiveGrossMargin,
  });

  return {
    activeCustomersStart,
    derivedChurned,
    churnValue,
    derivedEndCustomers,
    avgCustomers,
    arpcValue,
    derivedMarketingSpend,
    cacValue,
    effectiveGrossMargin,
    grossProfitPerCustomer,
    currentRevenuePerPeriod,
    currentProfitPerPeriod,
  };
};

const buildForecastPointProfit = ({
  revenue,
  averageCustomers,
  grossProfitInputMode,
  grossMargin,
  deliveryCostPerCustomerPerPeriod,
  fixedDeliveryCostPerPeriod,
  derivedMarketingSpend,
}: {
  revenue: number;
  averageCustomers: number;
  grossProfitInputMode: SubscriptionOfferInput["grossProfitInputMode"];
  grossMargin?: number;
  deliveryCostPerCustomerPerPeriod?: number;
  fixedDeliveryCostPerPeriod?: number;
  derivedMarketingSpend: number;
}) => {
  const grossProfit =
    grossProfitInputMode === "costs"
      ? revenue -
        (deliveryCostPerCustomerPerPeriod ?? 0) * averageCustomers -
        (fixedDeliveryCostPerPeriod ?? 0)
      : grossMargin != null
        ? revenue * grossMargin
        : null;

  return grossProfit == null ? null : grossProfit - derivedMarketingSpend;
};

export const buildSubscriptionForecast = (
  input: SubscriptionOfferInput,
  derived = deriveSubscriptionMetrics(input),
): SubscriptionForecast => {
  const currentCustomers = Math.max(derived.activeCustomersStart ?? 0, 0);
  const steadyStateCustomers =
    derived.churnValue != null && derived.churnValue > 0
      ? input.newCustomersPerPeriod / derived.churnValue
      : null;
  const steadyStateRevenuePerPeriod =
    steadyStateCustomers != null && derived.arpcValue != null
      ? steadyStateCustomers * derived.arpcValue
      : null;
  const steadyStateProfitPerPeriod =
    steadyStateCustomers != null && derived.grossProfitPerCustomer != null
      ? steadyStateCustomers * derived.grossProfitPerCustomer
      : null;

  if (derived.arpcValue == null || derived.churnValue == null) {
    return {
      current: {
        revenue: derived.currentRevenuePerPeriod,
        profit: derived.currentProfitPerPeriod,
        customers: currentCustomers,
      },
      points: [],
      totals: {
        revenue: null,
        profit: null,
      },
      steadyState: {
        customers: steadyStateCustomers,
        revenuePerPeriod: steadyStateRevenuePerPeriod,
        profitPerPeriod: steadyStateProfitPerPeriod,
        revenuePerYear:
          steadyStateRevenuePerPeriod != null
            ? annualizedRevenue(steadyStateRevenuePerPeriod, input.analysisPeriod)
            : null,
        profitPerYear:
          steadyStateProfitPerPeriod != null
            ? annualizedRevenue(steadyStateProfitPerPeriod, input.analysisPeriod)
            : null,
      },
    };
  }

  const points: SubscriptionForecastPoint[] = [];
  const totalSteps = periodsPerYear(input.analysisPeriod);
  let activeCustomers = currentCustomers;
  let totalRevenue = 0;
  let totalProfit: number | null = 0;

  for (let step = 1; step <= totalSteps; step += 1) {
    const churnedCustomers = activeCustomers * derived.churnValue;
    const endCustomers = activeCustomers + input.newCustomersPerPeriod - churnedCustomers;
    const averageCustomers = averageActiveCustomers(activeCustomers, endCustomers);
    const revenue = derived.arpcValue * averageCustomers;
    const profit = buildForecastPointProfit({
      revenue,
      averageCustomers,
      grossProfitInputMode: input.grossProfitInputMode,
      grossMargin: derived.effectiveGrossMargin ?? undefined,
      deliveryCostPerCustomerPerPeriod: input.deliveryCostPerCustomerPerPeriod,
      fixedDeliveryCostPerPeriod: input.fixedDeliveryCostPerPeriod,
      derivedMarketingSpend: derived.derivedMarketingSpend,
    });

    totalRevenue += revenue;
    totalProfit = totalProfit == null || profit == null ? null : totalProfit + profit;

    points.push({
      step,
      endCustomers,
      averageCustomers,
      revenue,
      profit,
    });

    activeCustomers = endCustomers;
  }

  return {
    current: {
      revenue: derived.currentRevenuePerPeriod,
      profit: derived.currentProfitPerPeriod,
      customers: currentCustomers,
    },
    points,
    totals: {
      revenue: totalRevenue,
      profit: totalProfit,
    },
    steadyState: {
      customers: steadyStateCustomers,
      revenuePerPeriod: steadyStateRevenuePerPeriod,
      profitPerPeriod: steadyStateProfitPerPeriod,
      revenuePerYear:
        steadyStateRevenuePerPeriod != null
          ? annualizedRevenue(steadyStateRevenuePerPeriod, input.analysisPeriod)
          : null,
      profitPerYear:
        steadyStateProfitPerPeriod != null
          ? annualizedRevenue(steadyStateProfitPerPeriod, input.analysisPeriod)
          : null,
    },
  };
};

export const forecastStepLabels = (period: KpiPeriod, count: number) => {
  return Array.from({ length: count + 1 }, (_, index) => {
    if (index === 0) {
      return "Now";
    }
    if (period === "monthly") {
      return `M${index}`;
    }
    if (period === "quarterly") {
      return `Q${index}`;
    }
    return `Y${index}`;
  });
};
