import {
  annualizedRevenue,
  averageActiveCustomers,
  cac,
  churnRate,
  churnedFromStart,
  periodsPerYear,
  ltgpPerCustomer,
  ltvSubscription,
  ratioLtgpToCac,
} from "./formulas";
import {
  buildSubscriptionForecast,
  deriveSubscriptionMetrics,
  type SubscriptionDerivedMetrics,
} from "./subscription-forecast";
import type {
  KPIResult,
  SoftwareHybridPlatformUsageInput,
  SoftwareImplementationPlusSubscriptionInput,
  SoftwarePaidPilotInput,
  SoftwareTokenPricingInput,
  SubscriptionOfferInput,
} from "./types";

export type NormalizedAcquisitionModel = {
  newCustomersPerPeriod: number;
  cacPerNewCustomer: number | null;
  acquisitionSpendPerPeriod: number;
};

export type NormalizedRecurringModel = {
  activeCustomersStart: number | null;
  arpcPerActiveCustomerPerPeriod: number | null;
  grossProfitPerActiveCustomerPerPeriod: number | null;
  churnRatePerPeriod: number | null;
  retentionRatePerPeriod: number | null;
  derivedEndCustomers: number | null;
  averageCustomers: number | null;
  effectiveGrossMargin: number | null;
};

export type NormalizedOneTimeModel = {
  revenuePerNewCustomer: number | null;
  grossProfitPerNewCustomer: number | null;
};

export type NormalizedForecastMode = "recurring" | "throughput" | "mixed";

export type NormalizedForecastSummary = {
  hypotheticalMaxCustomers: number | null;
  hypotheticalMaxRevenuePerYear: number | null;
  hypotheticalMaxProfitPerYear: number | null;
  projectedRevenueNextYear: number | null;
  projectedProfitNextYear: number | null;
};

export type NormalizedSoftwareEconomics = {
  offerType:
    | "software_subscription"
    | "software_paid_pilot"
    | "software_token_pricing"
    | "software_hybrid_platform_usage"
    | "software_implementation_plus_subscription";
  analysisPeriod:
    | SubscriptionOfferInput["analysisPeriod"]
    | SoftwarePaidPilotInput["analysisPeriod"]
    | SoftwareTokenPricingInput["analysisPeriod"]
    | SoftwareHybridPlatformUsageInput["analysisPeriod"]
    | SoftwareImplementationPlusSubscriptionInput["analysisPeriod"];
  acquisition: NormalizedAcquisitionModel;
  recurring: NormalizedRecurringModel | null;
  oneTime: NormalizedOneTimeModel | null;
  forecastMode: NormalizedForecastMode;
  forecast: NormalizedForecastSummary;
  assumptionsApplied: string[];
  warnings: string[];
  usedFlexibleCostInputs: boolean;
};

export type NormalizedRecurringSoftwareEconomics = NormalizedSoftwareEconomics & {
  offerType:
    | "software_subscription"
    | "software_token_pricing"
    | "software_hybrid_platform_usage";
  recurring: NormalizedRecurringModel;
  forecastMode: "recurring";
};

export type NormalizedThroughputSoftwareEconomics = NormalizedSoftwareEconomics & {
  offerType: "software_paid_pilot";
  recurring: null;
  oneTime: NormalizedOneTimeModel;
  forecastMode: "throughput";
};

export type NormalizedMixedSoftwareEconomics = NormalizedSoftwareEconomics & {
  offerType: "software_implementation_plus_subscription";
  recurring: NormalizedRecurringModel;
  oneTime: NormalizedOneTimeModel;
  forecastMode: "mixed";
};

const hasFlexibleCostInputs = (input: SubscriptionOfferInput) => {
  return (
    (input.revenueInputMode ?? "total_revenue") === "direct_arpc" ||
    (input.grossProfitInputMode ?? "margin") === "costs" ||
    (input.cacInputMode ?? "derived") === "direct" ||
    (input.retentionInputMode ?? "counts") === "rate"
  );
};

const deriveAcquisitionModel = ({
  newCustomersPerPeriod,
  cacInputMode,
  marketingSpendPerPeriod,
  directCac,
}: {
  newCustomersPerPeriod: number;
  cacInputMode?: "derived" | "direct";
  marketingSpendPerPeriod?: number;
  directCac?: number;
}) => {
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

const buildRecurringForecastSummary = ({
  analysisPeriod,
  activeCustomersStart,
  newCustomersPerPeriod,
  churnRatePerPeriod,
  arpcPerActiveCustomerPerPeriod,
  grossProfitPerActiveCustomerPerPeriod,
  acquisitionSpendPerPeriod,
}: {
  analysisPeriod:
    | SubscriptionOfferInput["analysisPeriod"]
    | SoftwareTokenPricingInput["analysisPeriod"]
    | SoftwareHybridPlatformUsageInput["analysisPeriod"]
    | SoftwareImplementationPlusSubscriptionInput["analysisPeriod"];
  activeCustomersStart: number;
  newCustomersPerPeriod: number;
  churnRatePerPeriod: number | null;
  arpcPerActiveCustomerPerPeriod: number | null;
  grossProfitPerActiveCustomerPerPeriod: number | null;
  acquisitionSpendPerPeriod: number;
}): NormalizedForecastSummary => {
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

const buildThroughputAnnualSummary = ({
  analysisPeriod,
  newCustomersPerPeriod,
  revenuePerNewCustomer,
  grossProfitPerNewCustomer,
}: {
  analysisPeriod:
    | SoftwarePaidPilotInput["analysisPeriod"]
    | SoftwareImplementationPlusSubscriptionInput["analysisPeriod"];
  newCustomersPerPeriod: number;
  revenuePerNewCustomer: number;
  grossProfitPerNewCustomer: number;
}) => {
  const annualRevenue = annualizedRevenue(
    revenuePerNewCustomer * newCustomersPerPeriod,
    analysisPeriod,
  );
  const annualGrossProfit = annualizedRevenue(
    grossProfitPerNewCustomer * newCustomersPerPeriod,
    analysisPeriod,
  );

  return {
    annualRevenue,
    annualGrossProfit,
  };
};

const buildRecurringRetentionModel = ({
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
  retentionInputMode?: "counts" | "rate";
  directChurnRatePerPeriod?: number;
  churnedCustomersPerPeriod?: number;
  retainedCustomersFromStartAtEnd?: number;
}) => {
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

const buildSubscriptionNormalizationNotes = ({
  input,
  derived,
}: {
  input: SubscriptionOfferInput;
  derived: SubscriptionDerivedMetrics;
}) => {
  const assumptionsApplied: string[] = [];
  const warnings: string[] = [];
  const revenueInputMode = input.revenueInputMode ?? "total_revenue";
  const grossProfitInputMode = input.grossProfitInputMode ?? "margin";
  const cacInputMode = input.cacInputMode ?? "derived";
  const retentionInputMode = input.retentionInputMode ?? "counts";

  if (retentionInputMode === "rate") {
    assumptionsApplied.push("Used direct churn rate for subscription retention.");
    if (derived.activeCustomersStart != null) {
      assumptionsApplied.push(
        "Derived churned customers from activeCustomersStart * churn rate.",
      );
    }
  } else if (input.retainedCustomersFromStartAtEnd != null) {
    assumptionsApplied.push(
      "Derived churned customers from retainedCustomersFromStartAtEnd.",
    );
  } else {
    assumptionsApplied.push("Used provided churnedCustomersPerPeriod.");
  }

  if (derived.churnValue != null && derived.churnValue < 0.005) {
    warnings.push("Churn is very low; LTV may be inflated.");
  }

  if (
    derived.derivedEndCustomers != null &&
    derived.activeCustomersStart != null
  ) {
    assumptionsApplied.push("Derived end customers as start + new - churned.");
  }

  if (derived.derivedEndCustomers != null && derived.derivedEndCustomers < 0) {
    warnings.push(
      "Derived end customers is negative; check start, new, and churn inputs.",
    );
  }

  if (revenueInputMode === "direct_arpc") {
    assumptionsApplied.push("Used direct subscription price / ARPC.");
  }

  if (grossProfitInputMode === "costs" && derived.arpcValue != null) {
    assumptionsApplied.push(
      "Derived gross profit from delivery costs per active customer.",
    );
    if (
      (input.fixedDeliveryCostPerPeriod ?? 0) > 0 &&
      derived.avgCustomers != null &&
      derived.avgCustomers > 0
    ) {
      assumptionsApplied.push(
        "Allocated fixed delivery cost across average active customers.",
      );
    } else if ((input.fixedDeliveryCostPerPeriod ?? 0) > 0) {
      warnings.push(
        "Fixed delivery cost was provided without an active customer base; fixed cost was not allocated per customer.",
      );
    }
  }

  if (cacInputMode === "direct") {
    assumptionsApplied.push(
      "Used direct CAC instead of deriving CAC from marketing spend.",
    );
  }

  if (derived.effectiveGrossMargin != null && derived.effectiveGrossMargin < 0) {
    warnings.push(
      "Delivery costs exceed revenue per customer; gross profit is negative.",
    );
  }

  return { assumptionsApplied, warnings };
};

export const normalizeSoftwareSubscriptionOffer = (
  input: SubscriptionOfferInput,
): NormalizedRecurringSoftwareEconomics => {
  const derived = deriveSubscriptionMetrics(input);
  const forecast = buildSubscriptionForecast(input, derived);
  const notes = buildSubscriptionNormalizationNotes({ input, derived });

  return {
    offerType: "software_subscription",
    analysisPeriod: input.analysisPeriod,
    acquisition: {
      newCustomersPerPeriod: input.newCustomersPerPeriod,
      cacPerNewCustomer: derived.cacValue,
      acquisitionSpendPerPeriod: derived.derivedMarketingSpend,
    },
    recurring: {
      activeCustomersStart: derived.activeCustomersStart,
      arpcPerActiveCustomerPerPeriod: derived.arpcValue,
      grossProfitPerActiveCustomerPerPeriod: derived.grossProfitPerCustomer,
      churnRatePerPeriod: derived.churnValue,
      retentionRatePerPeriod:
        derived.churnValue == null ? null : 1 - derived.churnValue,
      derivedEndCustomers: derived.derivedEndCustomers,
      averageCustomers: derived.avgCustomers,
      effectiveGrossMargin: derived.effectiveGrossMargin,
    },
    oneTime: null,
    forecastMode: "recurring",
    forecast: {
      hypotheticalMaxCustomers: forecast.steadyState.customers,
      hypotheticalMaxRevenuePerYear: forecast.steadyState.revenuePerYear,
      hypotheticalMaxProfitPerYear: forecast.steadyState.profitPerYear,
      projectedRevenueNextYear: forecast.totals.revenue,
      projectedProfitNextYear: forecast.totals.profit,
    },
    assumptionsApplied: notes.assumptionsApplied,
    warnings: notes.warnings,
    usedFlexibleCostInputs: hasFlexibleCostInputs(input),
  };
};

export const normalizeSoftwarePaidPilotOffer = (
  input: SoftwarePaidPilotInput,
): NormalizedThroughputSoftwareEconomics => {
  const acquisition = deriveAcquisitionModel(input);
  const grossProfitPerNewCustomer =
    input.pilotGrossMargin != null
      ? input.pilotFeePerNewCustomer * input.pilotGrossMargin
      : input.pilotFeePerNewCustomer - (input.pilotDeliveryCostPerNewCustomer ?? 0);
  const projectedRevenueNextYear = annualizedRevenue(
    input.pilotFeePerNewCustomer * input.newCustomersPerPeriod,
    input.analysisPeriod,
  );
  const projectedProfitNextYear = annualizedRevenue(
    grossProfitPerNewCustomer * input.newCustomersPerPeriod -
      acquisition.acquisitionSpendPerPeriod,
    input.analysisPeriod,
  );

  const assumptionsApplied: string[] = [];
  const warnings: string[] = [];

  if (acquisition.mode === "direct") {
    assumptionsApplied.push(
      "Used direct CAC instead of deriving CAC from marketing spend.",
    );
  }

  if (input.pilotGrossMargin != null) {
    assumptionsApplied.push("Derived pilot gross profit from pilot gross margin.");
  } else {
    assumptionsApplied.push(
      "Derived pilot gross profit from pilot delivery cost per new customer.",
    );
  }

  assumptionsApplied.push(
    "Projected annual pilot revenue and profit from new pilots acquired per period.",
  );

  if (grossProfitPerNewCustomer < 0) {
    warnings.push("Pilot delivery costs exceed pilot revenue; gross profit is negative.");
  }

  return {
    offerType: "software_paid_pilot",
    analysisPeriod: input.analysisPeriod,
    acquisition: {
      newCustomersPerPeriod: input.newCustomersPerPeriod,
      cacPerNewCustomer: acquisition.cacPerNewCustomer,
      acquisitionSpendPerPeriod: acquisition.acquisitionSpendPerPeriod,
    },
    recurring: null,
    oneTime: {
      revenuePerNewCustomer: input.pilotFeePerNewCustomer,
      grossProfitPerNewCustomer,
    },
    forecastMode: "throughput",
    forecast: {
      hypotheticalMaxCustomers: null,
      hypotheticalMaxRevenuePerYear: null,
      hypotheticalMaxProfitPerYear: null,
      projectedRevenueNextYear,
      projectedProfitNextYear,
    },
    assumptionsApplied,
    warnings,
    usedFlexibleCostInputs: acquisition.mode === "direct",
  };
};

export const normalizeSoftwareTokenPricingOffer = (
  input: SoftwareTokenPricingInput,
): NormalizedRecurringSoftwareEconomics => {
  const acquisition = deriveAcquisitionModel(input);
  const retention = buildRecurringRetentionModel({
    retentionSubject: "token",
    activeCustomersStart: input.activeCustomersStart,
    newCustomersPerPeriod: input.newCustomersPerPeriod,
    retentionInputMode: input.retentionInputMode,
    directChurnRatePerPeriod: input.directChurnRatePerPeriod,
    churnedCustomersPerPeriod: input.churnedCustomersPerPeriod,
    retainedCustomersFromStartAtEnd: input.retainedCustomersFromStartAtEnd,
  });
  const arpcPerActiveCustomerPerPeriod =
    input.usageUnitsPerCustomerPerPeriod * input.pricePerUsageUnit;
  const fixedCostShare =
    retention.averageCustomers != null && retention.averageCustomers > 0
      ? (input.fixedDeliveryCostPerPeriod ?? 0) / retention.averageCustomers
      : 0;
  const grossProfitPerActiveCustomerPerPeriod =
    input.usageUnitsPerCustomerPerPeriod *
      (input.pricePerUsageUnit - input.costPerUsageUnit) -
    fixedCostShare;
  const effectiveGrossMargin =
    arpcPerActiveCustomerPerPeriod > 0
      ? grossProfitPerActiveCustomerPerPeriod / arpcPerActiveCustomerPerPeriod
      : null;
  const forecast = buildRecurringForecastSummary({
    analysisPeriod: input.analysisPeriod,
    activeCustomersStart: input.activeCustomersStart,
    newCustomersPerPeriod: input.newCustomersPerPeriod,
    churnRatePerPeriod: retention.churnValue,
    arpcPerActiveCustomerPerPeriod,
    grossProfitPerActiveCustomerPerPeriod,
    acquisitionSpendPerPeriod: acquisition.acquisitionSpendPerPeriod,
  });

  const assumptionsApplied = [...retention.assumptionsApplied];
  const warnings = [...retention.warnings];

  assumptionsApplied.push(
    "Derived token ARPC from usage units per customer and price per usage unit.",
  );
  assumptionsApplied.push(
    "Derived token gross profit from usage unit revenue minus usage unit cost.",
  );
  if ((input.fixedDeliveryCostPerPeriod ?? 0) > 0) {
    assumptionsApplied.push(
      "Allocated fixed delivery cost across average active customers.",
    );
  }
  if (acquisition.mode === "direct") {
    assumptionsApplied.push(
      "Used direct CAC instead of deriving CAC from marketing spend.",
    );
  }
  if (grossProfitPerActiveCustomerPerPeriod < 0) {
    warnings.push(
      "Token delivery costs exceed revenue per customer; gross profit is negative.",
    );
  }

  return {
    offerType: "software_token_pricing",
    analysisPeriod: input.analysisPeriod,
    acquisition: {
      newCustomersPerPeriod: input.newCustomersPerPeriod,
      cacPerNewCustomer: acquisition.cacPerNewCustomer,
      acquisitionSpendPerPeriod: acquisition.acquisitionSpendPerPeriod,
    },
    recurring: {
      activeCustomersStart: input.activeCustomersStart,
      arpcPerActiveCustomerPerPeriod,
      grossProfitPerActiveCustomerPerPeriod,
      churnRatePerPeriod: retention.churnValue,
      retentionRatePerPeriod: retention.retentionValue,
      derivedEndCustomers: retention.derivedEndCustomers,
      averageCustomers: retention.averageCustomers,
      effectiveGrossMargin,
    },
    oneTime: null,
    forecastMode: "recurring",
    forecast,
    assumptionsApplied,
    warnings,
    usedFlexibleCostInputs:
      acquisition.mode === "direct" ||
      (input.retentionInputMode ?? "counts") === "rate",
  };
};

export const normalizeSoftwareHybridPlatformUsageOffer = (
  input: SoftwareHybridPlatformUsageInput,
): NormalizedRecurringSoftwareEconomics => {
  const acquisition = deriveAcquisitionModel(input);
  const retention = buildRecurringRetentionModel({
    retentionSubject: "hybrid platform + usage",
    activeCustomersStart: input.activeCustomersStart,
    newCustomersPerPeriod: input.newCustomersPerPeriod,
    retentionInputMode: input.retentionInputMode,
    directChurnRatePerPeriod: input.directChurnRatePerPeriod,
    churnedCustomersPerPeriod: input.churnedCustomersPerPeriod,
    retainedCustomersFromStartAtEnd: input.retainedCustomersFromStartAtEnd,
  });
  const usageRevenuePerCustomer =
    input.usageUnitsPerCustomerPerPeriod * input.pricePerUsageUnit;
  const usageCostPerCustomer =
    input.usageUnitsPerCustomerPerPeriod * (input.costPerUsageUnit ?? 0);
  const arpcPerActiveCustomerPerPeriod =
    input.platformFeePerCustomerPerPeriod + usageRevenuePerCustomer;
  const fixedCostShare =
    retention.averageCustomers != null && retention.averageCustomers > 0
      ? (input.fixedDeliveryCostPerPeriod ?? 0) / retention.averageCustomers
      : 0;
  const grossProfitPerActiveCustomerPerPeriod =
    input.platformFeePerCustomerPerPeriod -
    (input.platformDeliveryCostPerCustomerPerPeriod ?? 0) +
    usageRevenuePerCustomer -
    usageCostPerCustomer -
    fixedCostShare;
  const effectiveGrossMargin =
    arpcPerActiveCustomerPerPeriod > 0
      ? grossProfitPerActiveCustomerPerPeriod / arpcPerActiveCustomerPerPeriod
      : null;
  const forecast = buildRecurringForecastSummary({
    analysisPeriod: input.analysisPeriod,
    activeCustomersStart: input.activeCustomersStart,
    newCustomersPerPeriod: input.newCustomersPerPeriod,
    churnRatePerPeriod: retention.churnValue,
    arpcPerActiveCustomerPerPeriod,
    grossProfitPerActiveCustomerPerPeriod,
    acquisitionSpendPerPeriod: acquisition.acquisitionSpendPerPeriod,
  });

  const assumptionsApplied = [...retention.assumptionsApplied];
  const warnings = [...retention.warnings];

  assumptionsApplied.push(
    "Derived blended hybrid ARPC from platform fee plus usage revenue per customer.",
  );
  assumptionsApplied.push(
    "Derived blended hybrid gross profit from platform gross profit plus usage gross profit.",
  );
  if ((input.fixedDeliveryCostPerPeriod ?? 0) > 0) {
    assumptionsApplied.push(
      "Allocated fixed delivery cost across average active customers.",
    );
  }
  if (acquisition.mode === "direct") {
    assumptionsApplied.push(
      "Used direct CAC instead of deriving CAC from marketing spend.",
    );
  }
  if (grossProfitPerActiveCustomerPerPeriod < 0) {
    warnings.push(
      "Hybrid platform + usage delivery costs exceed revenue per customer; gross profit is negative.",
    );
  }

  return {
    offerType: "software_hybrid_platform_usage",
    analysisPeriod: input.analysisPeriod,
    acquisition: {
      newCustomersPerPeriod: input.newCustomersPerPeriod,
      cacPerNewCustomer: acquisition.cacPerNewCustomer,
      acquisitionSpendPerPeriod: acquisition.acquisitionSpendPerPeriod,
    },
    recurring: {
      activeCustomersStart: input.activeCustomersStart,
      arpcPerActiveCustomerPerPeriod,
      grossProfitPerActiveCustomerPerPeriod,
      churnRatePerPeriod: retention.churnValue,
      retentionRatePerPeriod: retention.retentionValue,
      derivedEndCustomers: retention.derivedEndCustomers,
      averageCustomers: retention.averageCustomers,
      effectiveGrossMargin,
    },
    oneTime: null,
    forecastMode: "recurring",
    forecast,
    assumptionsApplied,
    warnings,
    usedFlexibleCostInputs:
      acquisition.mode === "direct" ||
      (input.retentionInputMode ?? "counts") === "rate",
  };
};

export const normalizeSoftwareImplementationPlusSubscriptionOffer = (
  input: SoftwareImplementationPlusSubscriptionInput,
): NormalizedMixedSoftwareEconomics => {
  const acquisition = deriveAcquisitionModel(input);
  const retention = buildRecurringRetentionModel({
    retentionSubject: "implementation + subscription",
    activeCustomersStart: input.activeCustomersStart,
    newCustomersPerPeriod: input.newCustomersPerPeriod,
    retentionInputMode: input.retentionInputMode,
    directChurnRatePerPeriod: input.directChurnRatePerPeriod,
    churnedCustomersPerPeriod: input.churnedCustomersPerPeriod,
    retainedCustomersFromStartAtEnd: input.retainedCustomersFromStartAtEnd,
  });
  const arpcPerActiveCustomerPerPeriod = input.directArpc;
  const fixedCostShare =
    retention.averageCustomers != null && retention.averageCustomers > 0
      ? (input.fixedDeliveryCostPerPeriod ?? 0) / retention.averageCustomers
      : 0;
  const grossProfitPerActiveCustomerPerPeriod =
    (input.grossProfitInputMode ?? "margin") === "costs"
      ? input.directArpc -
        (input.deliveryCostPerCustomerPerPeriod ?? 0) -
        fixedCostShare
      : input.directArpc * (input.grossMargin ?? 0);
  const effectiveGrossMargin =
    arpcPerActiveCustomerPerPeriod > 0
      ? grossProfitPerActiveCustomerPerPeriod / arpcPerActiveCustomerPerPeriod
      : null;
  const implementationGrossProfitPerNewCustomer =
    input.implementationGrossMargin != null
      ? input.implementationFeePerNewCustomer * input.implementationGrossMargin
      : input.implementationFeePerNewCustomer -
        (input.implementationDeliveryCostPerNewCustomer ?? 0);
  const recurringForecast = buildRecurringForecastSummary({
    analysisPeriod: input.analysisPeriod,
    activeCustomersStart: input.activeCustomersStart,
    newCustomersPerPeriod: input.newCustomersPerPeriod,
    churnRatePerPeriod: retention.churnValue,
    arpcPerActiveCustomerPerPeriod,
    grossProfitPerActiveCustomerPerPeriod,
    acquisitionSpendPerPeriod: acquisition.acquisitionSpendPerPeriod,
  });
  const oneTimeAnnual = buildThroughputAnnualSummary({
    analysisPeriod: input.analysisPeriod,
    newCustomersPerPeriod: input.newCustomersPerPeriod,
    revenuePerNewCustomer: input.implementationFeePerNewCustomer,
    grossProfitPerNewCustomer: implementationGrossProfitPerNewCustomer,
  });

  const assumptionsApplied = [...retention.assumptionsApplied];
  const warnings = [...retention.warnings];

  assumptionsApplied.push("Used direct subscription ARPC for recurring subscription revenue.");
  if ((input.grossProfitInputMode ?? "margin") === "costs") {
    assumptionsApplied.push(
      "Derived recurring subscription gross profit from delivery costs per active customer.",
    );
    if ((input.fixedDeliveryCostPerPeriod ?? 0) > 0) {
      assumptionsApplied.push(
        "Allocated fixed delivery cost across average active customers.",
      );
    }
  } else {
    assumptionsApplied.push(
      "Derived recurring subscription gross profit from recurring gross margin.",
    );
  }
  if (input.implementationGrossMargin != null) {
    assumptionsApplied.push(
      "Derived implementation gross profit from implementation gross margin.",
    );
  } else {
    assumptionsApplied.push(
      "Derived implementation gross profit from implementation delivery cost per new customer.",
    );
  }
  if (acquisition.mode === "direct") {
    assumptionsApplied.push(
      "Used direct CAC instead of deriving CAC from marketing spend.",
    );
  }

  if (grossProfitPerActiveCustomerPerPeriod < 0) {
    warnings.push(
      "Recurring subscription delivery costs exceed revenue per customer; gross profit is negative.",
    );
  }
  if (implementationGrossProfitPerNewCustomer < 0) {
    warnings.push(
      "Implementation delivery costs exceed implementation fee; implementation gross profit is negative.",
    );
  }

  return {
    offerType: "software_implementation_plus_subscription",
    analysisPeriod: input.analysisPeriod,
    acquisition: {
      newCustomersPerPeriod: input.newCustomersPerPeriod,
      cacPerNewCustomer: acquisition.cacPerNewCustomer,
      acquisitionSpendPerPeriod: acquisition.acquisitionSpendPerPeriod,
    },
    recurring: {
      activeCustomersStart: input.activeCustomersStart,
      arpcPerActiveCustomerPerPeriod,
      grossProfitPerActiveCustomerPerPeriod,
      churnRatePerPeriod: retention.churnValue,
      retentionRatePerPeriod: retention.retentionValue,
      derivedEndCustomers: retention.derivedEndCustomers,
      averageCustomers: retention.averageCustomers,
      effectiveGrossMargin,
    },
    oneTime: {
      revenuePerNewCustomer: input.implementationFeePerNewCustomer,
      grossProfitPerNewCustomer: implementationGrossProfitPerNewCustomer,
    },
    forecastMode: "mixed",
    forecast: {
      hypotheticalMaxCustomers: recurringForecast.hypotheticalMaxCustomers,
      hypotheticalMaxRevenuePerYear:
        (recurringForecast.hypotheticalMaxRevenuePerYear ?? 0) +
        oneTimeAnnual.annualRevenue,
      hypotheticalMaxProfitPerYear:
        (recurringForecast.hypotheticalMaxProfitPerYear ?? 0) +
        oneTimeAnnual.annualGrossProfit,
      projectedRevenueNextYear:
        (recurringForecast.projectedRevenueNextYear ?? 0) +
        oneTimeAnnual.annualRevenue,
      projectedProfitNextYear:
        (recurringForecast.projectedProfitNextYear ?? 0) +
        oneTimeAnnual.annualGrossProfit,
    },
    assumptionsApplied,
    warnings,
    usedFlexibleCostInputs:
      acquisition.mode === "direct" ||
      (input.retentionInputMode ?? "counts") === "rate" ||
      (input.grossProfitInputMode ?? "margin") === "costs",
  };
};

export const evaluateNormalizedRecurringSoftwareEconomics = (
  normalized: NormalizedRecurringSoftwareEconomics,
): {
  results: KPIResult;
  warnings: string[];
  assumptionsApplied: string[];
  usedFlexibleCostInputs: boolean;
} => {
  const warnings = [...normalized.warnings];
  const assumptionsApplied = [...normalized.assumptionsApplied];
  const cacValue = normalized.acquisition.cacPerNewCustomer;
  const arpcValue = normalized.recurring.arpcPerActiveCustomerPerPeriod;
  const grossProfitPerCustomer =
    normalized.recurring.grossProfitPerActiveCustomerPerPeriod;
  const churnValue = normalized.recurring.churnRatePerPeriod;
  const retentionValue = normalized.recurring.retentionRatePerPeriod;

  const cacPaybackPeriods =
    cacValue != null && grossProfitPerCustomer != null && grossProfitPerCustomer > 0
      ? cacValue / grossProfitPerCustomer
      : null;

  if (cacPaybackPeriods != null && cacPaybackPeriods > 12) {
    warnings.push("Payback is long; growth may be cash constrained.");
  }

  const ltv =
    grossProfitPerCustomer != null && churnValue != null && churnValue > 0
      ? grossProfitPerCustomer / churnValue
      : normalized.recurring.effectiveGrossMargin != null
        ? ltvSubscription(
            arpcValue,
            normalized.recurring.effectiveGrossMargin,
            churnValue,
          )
        : null;
  const ltgpValue = ltgpPerCustomer(ltv);
  const ratio = ratioLtgpToCac(ltgpValue, cacValue);

  if (
    normalized.forecast.projectedRevenueNextYear != null ||
    normalized.forecast.projectedProfitNextYear != null
  ) {
    assumptionsApplied.push(
      "Projected annual revenue and profit from direct price, churn rate, and sales velocity.",
    );
    if (normalized.recurring.activeCustomersStart == null) {
      assumptionsApplied.push(
        "Assumed zero starting active customers for annual projection.",
      );
    }
  }

  if (normalized.forecast.hypotheticalMaxCustomers != null) {
    assumptionsApplied.push(
      "Derived steady-state max customers as sales velocity divided by churn.",
    );
  }

  const results: KPIResult = {
    cac: cacValue,
    arpc: arpcValue,
    churnRate: churnValue,
    retentionRate: retentionValue,
    ltv,
    ltgpPerCustomer: ltgpValue,
    ltgpToCacRatio: ratio,
    cacPaybackPeriods,
    hypotheticalMaxCustomers: normalized.forecast.hypotheticalMaxCustomers,
    hypotheticalMaxRevenuePerYear:
      normalized.forecast.hypotheticalMaxRevenuePerYear,
    hypotheticalMaxProfitPerYear:
      normalized.forecast.hypotheticalMaxProfitPerYear,
    projectedRevenueNextYear: normalized.forecast.projectedRevenueNextYear,
    projectedProfitNextYear: normalized.forecast.projectedProfitNextYear,
    car: normalized.acquisition.newCustomersPerPeriod,
  };

  if (cacValue == null) {
    warnings.push("CAC cannot be computed (newCustomersPerPeriod is 0).");
  }
  if (results.ltgpPerCustomer != null && results.ltgpToCacRatio == null) {
    warnings.push("LTGP:CAC cannot be computed (CAC is 0).");
  }

  return {
    results,
    warnings,
    assumptionsApplied,
    usedFlexibleCostInputs: normalized.usedFlexibleCostInputs,
  };
};

export const evaluateNormalizedThroughputSoftwareEconomics = (
  normalized: NormalizedThroughputSoftwareEconomics,
): {
  results: KPIResult;
  warnings: string[];
  assumptionsApplied: string[];
  usedFlexibleCostInputs: boolean;
} => {
  const warnings = [...normalized.warnings];
  const assumptionsApplied = [...normalized.assumptionsApplied];
  const cacValue = normalized.acquisition.cacPerNewCustomer;
  const revenuePerNewCustomer = normalized.oneTime?.revenuePerNewCustomer ?? null;
  const grossProfitPerNewCustomer =
    normalized.oneTime?.grossProfitPerNewCustomer ?? null;
  const ltv = revenuePerNewCustomer;
  const ltgpValue = ltgpPerCustomer(grossProfitPerNewCustomer);
  const ratio = ratioLtgpToCac(ltgpValue, cacValue);
  const cacPaybackPeriods =
    cacValue != null &&
    grossProfitPerNewCustomer != null &&
    grossProfitPerNewCustomer > 0
      ? cacValue / grossProfitPerNewCustomer
      : null;

  if (cacPaybackPeriods != null && cacPaybackPeriods > 12) {
    warnings.push("Payback is long; growth may be cash constrained.");
  }

  const results: KPIResult = {
    cac: cacValue,
    arpc: revenuePerNewCustomer,
    churnRate: null,
    retentionRate: null,
    ltv,
    ltgpPerCustomer: ltgpValue,
    ltgpToCacRatio: ratio,
    cacPaybackPeriods,
    hypotheticalMaxCustomers: null,
    hypotheticalMaxRevenuePerYear: null,
    hypotheticalMaxProfitPerYear: null,
    projectedRevenueNextYear: normalized.forecast.projectedRevenueNextYear,
    projectedProfitNextYear: normalized.forecast.projectedProfitNextYear,
    car: normalized.acquisition.newCustomersPerPeriod,
  };

  if (cacValue == null) {
    warnings.push("CAC cannot be computed (newCustomersPerPeriod is 0).");
  }
  if (results.ltgpPerCustomer != null && results.ltgpToCacRatio == null) {
    warnings.push("LTGP:CAC cannot be computed (CAC is 0).");
  }

  return {
    results,
    warnings,
    assumptionsApplied,
    usedFlexibleCostInputs: normalized.usedFlexibleCostInputs,
  };
};

export const evaluateNormalizedMixedSoftwareEconomics = (
  normalized: NormalizedMixedSoftwareEconomics,
): {
  results: KPIResult;
  warnings: string[];
  assumptionsApplied: string[];
  usedFlexibleCostInputs: boolean;
} => {
  const warnings = [...normalized.warnings];
  const assumptionsApplied = [...normalized.assumptionsApplied];
  const cacValue = normalized.acquisition.cacPerNewCustomer;
  const arpcValue = normalized.recurring.arpcPerActiveCustomerPerPeriod;
  const grossProfitPerCustomer =
    normalized.recurring.grossProfitPerActiveCustomerPerPeriod;
  const churnValue = normalized.recurring.churnRatePerPeriod;
  const retentionValue = normalized.recurring.retentionRatePerPeriod;
  const oneTimeRevenuePerNewCustomer = normalized.oneTime.revenuePerNewCustomer;
  const oneTimeGrossProfitPerNewCustomer =
    normalized.oneTime.grossProfitPerNewCustomer;
  const recurringRevenueLifetime =
    arpcValue != null && churnValue != null && churnValue > 0
      ? arpcValue / churnValue
      : null;
  const recurringGrossProfitLifetime =
    grossProfitPerCustomer != null && churnValue != null && churnValue > 0
      ? grossProfitPerCustomer / churnValue
      : normalized.recurring.effectiveGrossMargin != null
        ? ltvSubscription(
            arpcValue,
            normalized.recurring.effectiveGrossMargin,
            churnValue,
          )
        : null;
  const ltv =
    recurringRevenueLifetime != null && oneTimeRevenuePerNewCustomer != null
      ? recurringRevenueLifetime + oneTimeRevenuePerNewCustomer
      : null;
  const ltgpValue =
    recurringGrossProfitLifetime != null &&
    oneTimeGrossProfitPerNewCustomer != null
      ? recurringGrossProfitLifetime + oneTimeGrossProfitPerNewCustomer
      : null;
  const ratio = ratioLtgpToCac(ltgpValue, cacValue);
  const firstPeriodContribution =
    (grossProfitPerCustomer ?? 0) + (oneTimeGrossProfitPerNewCustomer ?? 0);
  const cacPaybackPeriods =
    cacValue != null && firstPeriodContribution > 0
      ? cacValue / firstPeriodContribution
      : null;

  if (cacPaybackPeriods != null && cacPaybackPeriods > 12) {
    warnings.push("Payback is long; growth may be cash constrained.");
  }

  assumptionsApplied.push(
    "Projected annual revenue and profit from recurring subscription economics plus implementation throughput.",
  );
  if (normalized.forecast.hypotheticalMaxCustomers != null) {
    assumptionsApplied.push(
      "Derived steady-state max customers as sales velocity divided by churn.",
    );
  }

  const results: KPIResult = {
    cac: cacValue,
    arpc: arpcValue,
    churnRate: churnValue,
    retentionRate: retentionValue,
    ltv,
    ltgpPerCustomer: ltgpValue,
    ltgpToCacRatio: ratio,
    cacPaybackPeriods,
    hypotheticalMaxCustomers: normalized.forecast.hypotheticalMaxCustomers,
    hypotheticalMaxRevenuePerYear:
      normalized.forecast.hypotheticalMaxRevenuePerYear,
    hypotheticalMaxProfitPerYear:
      normalized.forecast.hypotheticalMaxProfitPerYear,
    projectedRevenueNextYear: normalized.forecast.projectedRevenueNextYear,
    projectedProfitNextYear: normalized.forecast.projectedProfitNextYear,
    car: normalized.acquisition.newCustomersPerPeriod,
  };

  if (cacValue == null) {
    warnings.push("CAC cannot be computed (newCustomersPerPeriod is 0).");
  }
  if (results.ltgpPerCustomer != null && results.ltgpToCacRatio == null) {
    warnings.push("LTGP:CAC cannot be computed (CAC is 0).");
  }

  return {
    results,
    warnings,
    assumptionsApplied,
    usedFlexibleCostInputs: normalized.usedFlexibleCostInputs,
  };
};

export const buildSoftwareSubscriptionEvaluation = (
  input: SubscriptionOfferInput,
) => {
  const normalized = normalizeSoftwareSubscriptionOffer(input);
  return evaluateNormalizedRecurringSoftwareEconomics(normalized);
};

export const buildSoftwarePaidPilotEvaluation = (
  input: SoftwarePaidPilotInput,
) => {
  const normalized = normalizeSoftwarePaidPilotOffer(input);
  return evaluateNormalizedThroughputSoftwareEconomics(normalized);
};

export const buildSoftwareTokenPricingEvaluation = (
  input: SoftwareTokenPricingInput,
) => {
  const normalized = normalizeSoftwareTokenPricingOffer(input);
  return evaluateNormalizedRecurringSoftwareEconomics(normalized);
};

export const buildSoftwareHybridPlatformUsageEvaluation = (
  input: SoftwareHybridPlatformUsageInput,
) => {
  const normalized = normalizeSoftwareHybridPlatformUsageOffer(input);
  return evaluateNormalizedRecurringSoftwareEconomics(normalized);
};

export const buildSoftwareImplementationPlusSubscriptionEvaluation = (
  input: SoftwareImplementationPlusSubscriptionInput,
) => {
  const normalized = normalizeSoftwareImplementationPlusSubscriptionOffer(input);
  return evaluateNormalizedMixedSoftwareEconomics(normalized);
};
