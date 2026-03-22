import { annualizedRevenue, ltgpPerCustomer, ltvSubscription, ratioLtgpToCac } from "./formulas";
import {
  buildRecurringForecastSummary,
  buildRecurringRetentionModel,
  deriveAcquisitionModel,
} from "./normalized-offer-helpers";
import type {
  EcommerceOneTimeProductInput,
  EcommerceRepeatPurchaseProductInput,
  EcommerceSubscriptionReplenishmentInput,
  KPIResult,
} from "./types";

export type EcommerceOfferEvaluation = {
  results: KPIResult;
  warnings: string[];
  assumptionsApplied: string[];
  usedFlexibleCostInputs: boolean;
};

export const buildEcommerceOneTimeProductEvaluation = (
  input: EcommerceOneTimeProductInput,
): EcommerceOfferEvaluation => {
  const acquisition = deriveAcquisitionModel(input);
  const refundMultiplier = 1 - (input.refundsRatePerOrder ?? 0);
  const netRevenuePerOrder = input.averageOrderValue * refundMultiplier;
  const grossProfitPerOrder =
    input.grossProfitPerOrder ?? netRevenuePerOrder * (input.grossMargin ?? 0);
  const projectedRevenueNextYear = annualizedRevenue(
    netRevenuePerOrder * input.newCustomersPerPeriod,
    input.analysisPeriod,
  );
  const projectedProfitNextYear = annualizedRevenue(
    grossProfitPerOrder * input.newCustomersPerPeriod -
      acquisition.acquisitionSpendPerPeriod,
    input.analysisPeriod,
  );
  const cacPaybackPeriods =
    acquisition.cacPerNewCustomer != null && grossProfitPerOrder > 0
      ? acquisition.cacPerNewCustomer / grossProfitPerOrder
      : null;

  const assumptionsApplied: string[] = [];
  const warnings: string[] = [];

  if ((input.refundsRatePerOrder ?? 0) > 0) {
    assumptionsApplied.push(
      "Adjusted order revenue for refund drag before calculating lifetime and projection outputs.",
    );
  }

  if (input.grossProfitPerOrder != null) {
    assumptionsApplied.push("Used direct gross profit per order.");
  } else {
    assumptionsApplied.push("Derived gross profit per order from gross margin.");
  }

  if (acquisition.mode === "direct") {
    assumptionsApplied.push(
      "Used direct CAC instead of deriving CAC from marketing spend.",
    );
  }

  assumptionsApplied.push(
    "Projected annual revenue and profit from new customers acquired per period.",
  );

  if (grossProfitPerOrder < 0) {
    warnings.push(
      "Gross profit per order is negative; contribution is below zero after refund and cost assumptions.",
    );
  }

  if (cacPaybackPeriods != null && cacPaybackPeriods > 12) {
    warnings.push("Payback is long; growth may be cash constrained.");
  }

  const results: KPIResult = {
    cac: acquisition.cacPerNewCustomer,
    arpc: netRevenuePerOrder,
    churnRate: null,
    retentionRate: null,
    ltv: netRevenuePerOrder,
    ltgpPerCustomer: grossProfitPerOrder,
    ltgpToCacRatio: ratioLtgpToCac(
      grossProfitPerOrder,
      acquisition.cacPerNewCustomer,
    ),
    cacPaybackPeriods,
    hypotheticalMaxCustomers: null,
    hypotheticalMaxRevenuePerYear: null,
    hypotheticalMaxProfitPerYear: null,
    projectedRevenueNextYear,
    projectedProfitNextYear,
    car: input.newCustomersPerPeriod,
  };

  if (acquisition.cacPerNewCustomer == null) {
    warnings.push("CAC cannot be computed (newCustomersPerPeriod is 0).");
  }

  if (results.ltgpPerCustomer != null && results.ltgpToCacRatio == null) {
    warnings.push("LTGP:CAC cannot be computed (CAC is 0).");
  }

  return {
    results,
    warnings,
    assumptionsApplied,
    usedFlexibleCostInputs:
      acquisition.mode === "direct" ||
      input.grossProfitPerOrder != null ||
      (input.refundsRatePerOrder ?? 0) > 0,
  };
};

export const buildEcommerceRepeatPurchaseProductEvaluation = (
  input: EcommerceRepeatPurchaseProductInput,
): EcommerceOfferEvaluation => {
  const acquisition = deriveAcquisitionModel(input);
  const refundMultiplier = 1 - (input.refundsRatePerOrder ?? 0);
  const netRevenuePerOrder = input.averageOrderValue * refundMultiplier;
  const grossProfitPerOrder =
    input.grossProfitPerOrder ?? netRevenuePerOrder * (input.grossMargin ?? 0);
  const expectedOrdersPerCustomer = input.expectedOrdersPerCustomer ?? 1;
  const lifetimeRevenuePerCustomer =
    netRevenuePerOrder * expectedOrdersPerCustomer;
  const lifetimeGrossProfitPerCustomer =
    grossProfitPerOrder * expectedOrdersPerCustomer;
  const projectedRevenueNextYear = annualizedRevenue(
    lifetimeRevenuePerCustomer * input.newCustomersPerPeriod,
    input.analysisPeriod,
  );
  const projectedProfitNextYear = annualizedRevenue(
    lifetimeGrossProfitPerCustomer * input.newCustomersPerPeriod -
      acquisition.acquisitionSpendPerPeriod,
    input.analysisPeriod,
  );
  const cacPaybackPeriods =
    acquisition.cacPerNewCustomer != null && grossProfitPerOrder > 0
      ? acquisition.cacPerNewCustomer / grossProfitPerOrder
      : null;

  const assumptionsApplied: string[] = [];
  const warnings: string[] = [];

  if ((input.refundsRatePerOrder ?? 0) > 0) {
    assumptionsApplied.push(
      "Adjusted order revenue for refund drag before calculating lifetime and projection outputs.",
    );
  }

  if (input.grossProfitPerOrder != null) {
    assumptionsApplied.push("Used direct gross profit per order.");
  } else {
    assumptionsApplied.push("Derived gross profit per order from gross margin.");
  }

  assumptionsApplied.push(
    "Used expected orders per customer to derive repeat-purchase lifetime value and gross profit.",
  );

  if (acquisition.mode === "direct") {
    assumptionsApplied.push(
      "Used direct CAC instead of deriving CAC from marketing spend.",
    );
  }

  assumptionsApplied.push(
    "Projected annual revenue and profit from new customers acquired per period using repeat-purchase lifetime assumptions.",
  );

  if (grossProfitPerOrder < 0) {
    warnings.push(
      "Gross profit per order is negative; contribution is below zero after refund and cost assumptions.",
    );
  }

  if (cacPaybackPeriods != null && cacPaybackPeriods > 12) {
    warnings.push("Payback is long; growth may be cash constrained.");
  }

  const results: KPIResult = {
    cac: acquisition.cacPerNewCustomer,
    arpc: netRevenuePerOrder,
    churnRate: null,
    retentionRate: null,
    ltv: lifetimeRevenuePerCustomer,
    ltgpPerCustomer: lifetimeGrossProfitPerCustomer,
    ltgpToCacRatio: ratioLtgpToCac(
      lifetimeGrossProfitPerCustomer,
      acquisition.cacPerNewCustomer,
    ),
    cacPaybackPeriods,
    hypotheticalMaxCustomers: null,
    hypotheticalMaxRevenuePerYear: null,
    hypotheticalMaxProfitPerYear: null,
    projectedRevenueNextYear,
    projectedProfitNextYear,
    car: input.newCustomersPerPeriod,
  };

  if (acquisition.cacPerNewCustomer == null) {
    warnings.push("CAC cannot be computed (newCustomersPerPeriod is 0).");
  }

  if (results.ltgpPerCustomer != null && results.ltgpToCacRatio == null) {
    warnings.push("LTGP:CAC cannot be computed (CAC is 0).");
  }

  return {
    results,
    warnings,
    assumptionsApplied,
    usedFlexibleCostInputs:
      acquisition.mode === "direct" ||
      input.grossProfitPerOrder != null ||
      (input.refundsRatePerOrder ?? 0) > 0,
  };
};

export const buildEcommerceSubscriptionReplenishmentEvaluation = (
  input: EcommerceSubscriptionReplenishmentInput,
): EcommerceOfferEvaluation => {
  const acquisition = deriveAcquisitionModel(input);
  const retention = buildRecurringRetentionModel({
    retentionSubject: "replenishment",
    activeCustomersStart: input.activeCustomersStart,
    newCustomersPerPeriod: input.newCustomersPerPeriod,
    retentionInputMode: input.retentionInputMode,
    directChurnRatePerPeriod: input.directChurnRatePerPeriod,
    churnedCustomersPerPeriod: input.churnedCustomersPerPeriod,
    retainedCustomersFromStartAtEnd: input.retainedCustomersFromStartAtEnd,
  });
  const ordersPerSubscriberPerPeriod = input.ordersPerSubscriberPerPeriod ?? 1;
  const netRevenuePerSubscriberPerPeriod =
    input.averageOrderValue *
    ordersPerSubscriberPerPeriod *
    (1 - (input.refundsRatePerPeriod ?? 0));
  const grossProfitPerSubscriberPerPeriod =
    input.grossProfitPerSubscriberPerPeriod ??
    netRevenuePerSubscriberPerPeriod * (input.grossMargin ?? 0);
  const effectiveGrossMargin =
    netRevenuePerSubscriberPerPeriod > 0
      ? grossProfitPerSubscriberPerPeriod / netRevenuePerSubscriberPerPeriod
      : 0;
  const forecast = buildRecurringForecastSummary({
    analysisPeriod: input.analysisPeriod,
    activeCustomersStart: input.activeCustomersStart,
    newCustomersPerPeriod: input.newCustomersPerPeriod,
    churnRatePerPeriod: retention.churnValue,
    arpcPerActiveCustomerPerPeriod: netRevenuePerSubscriberPerPeriod,
    grossProfitPerActiveCustomerPerPeriod: grossProfitPerSubscriberPerPeriod,
    acquisitionSpendPerPeriod: acquisition.acquisitionSpendPerPeriod,
  });
  const ltv = ltvSubscription(
    netRevenuePerSubscriberPerPeriod,
    effectiveGrossMargin,
    retention.churnValue,
  );
  const ltgp = ltgpPerCustomer(ltv);
  const cacPaybackPeriods =
    acquisition.cacPerNewCustomer != null && grossProfitPerSubscriberPerPeriod > 0
      ? acquisition.cacPerNewCustomer / grossProfitPerSubscriberPerPeriod
      : null;

  const assumptionsApplied = [...retention.assumptionsApplied];
  const warnings = [...retention.warnings];

  if (ordersPerSubscriberPerPeriod !== 1) {
    assumptionsApplied.push(
      "Derived recurring subscriber revenue from average order value multiplied by orders per subscriber per period.",
    );
  } else {
    assumptionsApplied.push(
      "Assumed one replenishment order per active subscriber per period.",
    );
  }

  if ((input.refundsRatePerPeriod ?? 0) > 0) {
    assumptionsApplied.push(
      "Adjusted recurring revenue for refund drag before calculating lifetime and projection outputs.",
    );
  }

  if (input.grossProfitPerSubscriberPerPeriod != null) {
    assumptionsApplied.push(
      "Used direct gross profit per subscriber per period.",
    );
  } else {
    assumptionsApplied.push(
      "Derived recurring gross profit from gross margin.",
    );
  }

  if (acquisition.mode === "direct") {
    assumptionsApplied.push(
      "Used direct CAC instead of deriving CAC from marketing spend.",
    );
  }

  if (grossProfitPerSubscriberPerPeriod < 0) {
    warnings.push(
      "Gross profit per subscriber per period is negative; contribution is below zero after refund and cost assumptions.",
    );
  }

  if (cacPaybackPeriods != null && cacPaybackPeriods > 12) {
    warnings.push("Payback is long; growth may be cash constrained.");
  }

  const results: KPIResult = {
    cac: acquisition.cacPerNewCustomer,
    arpc: netRevenuePerSubscriberPerPeriod,
    churnRate: retention.churnValue,
    retentionRate: retention.retentionValue,
    ltv,
    ltgpPerCustomer: ltgp,
    ltgpToCacRatio: ratioLtgpToCac(ltgp, acquisition.cacPerNewCustomer),
    cacPaybackPeriods,
    hypotheticalMaxCustomers: forecast.hypotheticalMaxCustomers,
    hypotheticalMaxRevenuePerYear: forecast.hypotheticalMaxRevenuePerYear,
    hypotheticalMaxProfitPerYear: forecast.hypotheticalMaxProfitPerYear,
    projectedRevenueNextYear: forecast.projectedRevenueNextYear,
    projectedProfitNextYear: forecast.projectedProfitNextYear,
    car: input.newCustomersPerPeriod,
  };

  if (acquisition.cacPerNewCustomer == null) {
    warnings.push("CAC cannot be computed (newCustomersPerPeriod is 0).");
  }

  if (results.ltgpPerCustomer != null && results.ltgpToCacRatio == null) {
    warnings.push("LTGP:CAC cannot be computed (CAC is 0).");
  }

  return {
    results,
    warnings,
    assumptionsApplied,
    usedFlexibleCostInputs:
      acquisition.mode === "direct" ||
      input.grossProfitPerSubscriberPerPeriod != null ||
      (input.refundsRatePerPeriod ?? 0) > 0 ||
      ordersPerSubscriberPerPeriod !== 1 ||
      (input.retentionInputMode ?? "counts") === "rate",
  };
};
