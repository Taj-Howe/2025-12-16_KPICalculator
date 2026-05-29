import test from "node:test";
import assert from "node:assert/strict";

import { buildAnalysisReport } from "../src/features/kpi/analysis";
import {
  buildCloseRatePricingSignal,
  buildPricingExplorerReport,
  pricingSensitivityPresets,
} from "../src/features/kpi/pricing-explorer";
import { evaluateKpis } from "../src/features/kpi/service";
import type { SubscriptionOfferInput } from "../src/features/kpi/types";

const subscriptionConfig = {
  industryPreset: "software_tech" as const,
  monetizationModel: "subscription_seat_based" as const,
  revenueComponents: [
    {
      componentType: "platform_subscription" as const,
      label: "Platform fee",
      pricingMetric: "workspace" as const,
    },
  ],
  goToMarketMotion: "product_led" as const,
};

const directSubscriptionPayload: SubscriptionOfferInput = {
  offerId: "pricing-analysis",
  offerName: "Pricing Analysis",
  offerType: "software_subscription",
  analysisPeriod: "monthly",
  revenueInputMode: "direct_arpc",
  directArpc: 3_000,
  grossProfitInputMode: "margin",
  grossMargin: 0.8,
  cacInputMode: "direct",
  directCac: 1_200,
  retentionInputMode: "rate",
  directChurnRatePerPeriod: 0.1,
  newCustomersPerPeriod: 20,
  activeCustomersStart: 100,
  softwareConfig: subscriptionConfig,
};

const approxEqual = (actual: number | null, expected: number, delta = 1e-9) => {
  assert.ok(actual != null, "Expected value to be present");
  assert.ok(
    Math.abs(actual - expected) <= delta,
    `Expected ${actual} to be within ${delta} of ${expected}`,
  );
};

const findScenario = (
  report: ReturnType<typeof buildPricingExplorerReport>,
  priceDelta: number,
) => {
  const scenario = report.scenarios.find(
    (item) => Math.abs(item.priceDelta - priceDelta) < 1e-9,
  );
  assert.ok(scenario, `Expected scenario ${priceDelta}`);
  return scenario;
};

test("pricing explorer couples +20% price to higher churn and lower sales velocity", () => {
  const report = buildPricingExplorerReport({
    evaluation: evaluateKpis(directSubscriptionPayload),
    assumptions: pricingSensitivityPresets.base,
  });

  assert.equal(report.eligible, true);
  const plusTwenty = findScenario(report, 0.2);

  assert.equal(plusTwenty.price, 3_600);
  assert.equal(plusTwenty.newCustomersPerPeriod, 18);
  approxEqual(plusTwenty.churnRate, 0.11);
});

test("pricing explorer couples -20% price to lower churn and higher sales velocity", () => {
  const report = buildPricingExplorerReport({
    evaluation: evaluateKpis(directSubscriptionPayload),
    assumptions: pricingSensitivityPresets.base,
  });

  const minusTwenty = findScenario(report, -0.2);

  assert.equal(minusTwenty.price, 2_400);
  assert.equal(minusTwenty.newCustomersPerPeriod, 22);
  approxEqual(minusTwenty.churnRate, 0.09);
});

test("pricing explorer calculates break-even churn from recurring gross profit", () => {
  const report = buildPricingExplorerReport({
    evaluation: evaluateKpis(directSubscriptionPayload),
    assumptions: pricingSensitivityPresets.base,
  });

  const plusTwenty = findScenario(report, 0.2);

  approxEqual(plusTwenty.recurringGrossProfitPerCustomer, 2_880);
  approxEqual(plusTwenty.breakEvenChurnRate, 0.12);
});

test("pricing explorer patches count-based churn through retained cohort counts", () => {
  const countBasedInput: SubscriptionOfferInput = {
    ...directSubscriptionPayload,
    retentionInputMode: "counts",
    directChurnRatePerPeriod: undefined,
    retainedCustomersFromStartAtEnd: 90,
  };
  const report = buildPricingExplorerReport({
    evaluation: evaluateKpis(countBasedInput),
    assumptions: pricingSensitivityPresets.base,
  });

  const plusTen = findScenario(report, 0.1);

  assert.equal(plusTen.inputs.retainedCustomersFromStartAtEnd, 89.5);
  assert.equal(plusTen.inputs.churnedCustomersPerPeriod, undefined);
  approxEqual(plusTen.results.churnRate, 0.105);
});

test("pricing explorer high sensitivity can make a higher price lose to baseline", () => {
  const sensitiveInput: SubscriptionOfferInput = {
    ...directSubscriptionPayload,
    directArpc: 100,
    grossMargin: 0.8,
    directCac: 100,
    directChurnRatePerPeriod: 0.2,
    newCustomersPerPeriod: 100,
    activeCustomersStart: 10,
  };
  const report = buildPricingExplorerReport({
    evaluation: evaluateKpis(sensitiveInput),
    assumptions: pricingSensitivityPresets.high,
  });

  const baseline = findScenario(report, 0);
  const plusThirty = findScenario(report, 0.3);

  assert.ok(
    (plusThirty.results.projectedProfitNextYear ?? 0) <
      (baseline.results.projectedProfitNextYear ?? 0),
  );
});

test("pricing explorer rejects total-revenue subscription mode", () => {
  const totalRevenueInput: SubscriptionOfferInput = {
    ...directSubscriptionPayload,
    revenueInputMode: "total_revenue",
    revenuePerPeriod: 300_000,
    directArpc: undefined,
  };
  const report = buildPricingExplorerReport({
    evaluation: evaluateKpis(totalRevenueInput),
    assumptions: pricingSensitivityPresets.base,
  });

  assert.equal(report.eligible, false);
  assert.match(report.ineligibleReason ?? "", /direct ARPC/i);
});

test("close-rate signal maps Hormozi pricing tiers", () => {
  const signal = buildCloseRatePricingSignal({
    closeRate: 0.7,
    channelContext: "balanced",
  });

  assert.equal(signal.status, "very_underpriced");
  assert.deepEqual(signal.priceMultiplierRange, { min: 2, max: 3 });
  assert.equal(signal.channelFit, "above_channel_range");
});

test("close-rate signal treats referral conversion against a higher target band", () => {
  const signal = buildCloseRatePricingSignal({
    closeRate: 0.45,
    channelContext: "referral",
  });

  assert.equal(signal.status, "modestly_underpriced");
  assert.deepEqual(signal.priceMultiplierRange, { min: 1.25, max: 1.5 });
  assert.equal(signal.channelFit, "within_channel_range");
  assert.match(signal.caveat, /40-55% target/);
});

test("close-rate signal points low cold conversion toward sales diagnosis first", () => {
  const signal = buildCloseRatePricingSignal({
    closeRate: 0.18,
    channelContext: "cold",
  });

  assert.equal(signal.status, "fix_sales_or_market");
  assert.deepEqual(signal.priceMultiplierRange, { min: null, max: null });
  assert.equal(signal.channelFit, "below_channel_range");
});

test("independent analysis price ranking still leaves churn unchanged", () => {
  const report = buildAnalysisReport({
    evaluation: evaluateKpis(directSubscriptionPayload),
  });
  const priceScenario = report.generatedScenarios.find(
    (scenario) =>
      scenario.scenario.lever === "price" &&
      Math.abs(scenario.scenario.amount - 0.1) < 1e-9,
  );

  assert.ok(priceScenario?.valid);
  assert.equal(priceScenario.results?.churnRate, 0.1);
});
