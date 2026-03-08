import test from "node:test";
import assert from "node:assert/strict";

import { evaluateOffer } from "../src/features/kpi/offer-evaluator";
import { normalizeSoftwareSubscriptionOffer } from "../src/features/kpi/software-tech-monetization";
import type { SubscriptionOfferInput } from "../src/features/kpi/types";

const softwareConfig = {
  industryPreset: "software_tech" as const,
  monetizationModel: "subscription_seat_based" as const,
  revenueComponents: [
    {
      componentType: "platform_subscription" as const,
      label: "Base platform fee",
      pricingMetric: "workspace" as const,
    },
    {
      componentType: "seat_subscription" as const,
      label: "Seat pricing",
      pricingMetric: "seat" as const,
    },
  ],
  goToMarketMotion: "sales_led" as const,
};

const toLegacySubscriptionOffer = (
  input: SubscriptionOfferInput,
): SubscriptionOfferInput => ({
  ...input,
  offerType: "subscription",
  softwareConfig: undefined,
});

test("software_subscription matches existing subscription evaluation for the standard recurring path", () => {
  const softwareInput: SubscriptionOfferInput = {
    offerId: "software-subscription",
    offerName: "Software Subscription",
    offerType: "software_subscription",
    analysisPeriod: "monthly",
    revenuePerPeriod: 100_000,
    grossMargin: 0.8,
    marketingSpendPerPeriod: 20_000,
    newCustomersPerPeriod: 20,
    activeCustomersStart: 100,
    retainedCustomersFromStartAtEnd: 92,
    softwareConfig,
  };

  const softwareEvaluation = evaluateOffer(softwareInput);
  const subscriptionEvaluation = evaluateOffer(
    toLegacySubscriptionOffer(softwareInput),
  );

  assert.deepEqual(softwareEvaluation.results, subscriptionEvaluation.results);
  assert.deepEqual(softwareEvaluation.warnings, subscriptionEvaluation.warnings);
  assert.deepEqual(
    softwareEvaluation.assumptionsApplied,
    subscriptionEvaluation.assumptionsApplied,
  );
  assert.equal(
    softwareEvaluation.usedFlexibleCostInputs,
    subscriptionEvaluation.usedFlexibleCostInputs,
  );
});

test("software_subscription matches existing subscription evaluation for the flexible-input path", () => {
  const softwareInput: SubscriptionOfferInput = {
    offerId: "ai-subscription",
    offerName: "AI Subscription",
    offerType: "software_subscription",
    analysisPeriod: "monthly",
    revenueInputMode: "direct_arpc",
    directArpc: 3_000,
    grossProfitInputMode: "costs",
    deliveryCostPerCustomerPerPeriod: 400,
    fixedDeliveryCostPerPeriod: 500,
    cacInputMode: "direct",
    directCac: 1_200,
    retentionInputMode: "rate",
    directChurnRatePerPeriod: 0.1,
    newCustomersPerPeriod: 3,
    activeCustomersStart: 10,
    softwareConfig,
  };

  const softwareEvaluation = evaluateOffer(softwareInput);
  const subscriptionEvaluation = evaluateOffer(
    toLegacySubscriptionOffer(softwareInput),
  );

  assert.deepEqual(softwareEvaluation.results, subscriptionEvaluation.results);
  assert.deepEqual(softwareEvaluation.warnings, subscriptionEvaluation.warnings);
  assert.deepEqual(
    softwareEvaluation.assumptionsApplied,
    subscriptionEvaluation.assumptionsApplied,
  );
  assert.equal(
    softwareEvaluation.usedFlexibleCostInputs,
    subscriptionEvaluation.usedFlexibleCostInputs,
  );
});

test("software_subscription normalizes into the shared recurring monetization shape", () => {
  const softwareInput: SubscriptionOfferInput = {
    offerId: "software-subscription",
    offerName: "Software Subscription",
    offerType: "software_subscription",
    analysisPeriod: "monthly",
    revenuePerPeriod: 100_000,
    grossMargin: 0.8,
    marketingSpendPerPeriod: 20_000,
    newCustomersPerPeriod: 20,
    activeCustomersStart: 100,
    retainedCustomersFromStartAtEnd: 92,
    softwareConfig,
  };

  const normalized = normalizeSoftwareSubscriptionOffer(softwareInput);

  assert.equal(normalized.offerType, "software_subscription");
  assert.equal(normalized.forecastMode, "recurring");
  assert.equal(normalized.oneTime, null);
  assert.equal(normalized.acquisition.newCustomersPerPeriod, 20);
  assert.equal(normalized.acquisition.cacPerNewCustomer, 1_000);
  assert.equal(normalized.acquisition.acquisitionSpendPerPeriod, 20_000);
  assert.equal(normalized.recurring.activeCustomersStart, 100);
  assert.equal(normalized.recurring.retentionRatePerPeriod, 0.92);
  assert.equal(normalized.recurring.churnRatePerPeriod, 0.08);
  assert.equal(normalized.recurring.derivedEndCustomers, 112);
  assert.equal(normalized.forecast.hypotheticalMaxCustomers, 250);
  assert.ok(
    normalized.assumptionsApplied.includes(
      "Derived churned customers from retainedCustomersFromStartAtEnd.",
    ),
  );
  assert.equal(normalized.usedFlexibleCostInputs, false);
});
