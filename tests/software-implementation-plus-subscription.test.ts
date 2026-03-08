import test from "node:test";
import assert from "node:assert/strict";

import { evaluateKpis } from "../src/features/kpi/service";
import { normalizeSoftwareImplementationPlusSubscriptionOffer } from "../src/features/kpi/software-tech-monetization";
import type { SoftwareImplementationPlusSubscriptionInput } from "../src/features/kpi/types";

const softwareConfig = {
  industryPreset: "software_tech" as const,
  monetizationModel: "implementation_plus_subscription" as const,
  revenueComponents: [
    {
      componentType: "implementation_fee" as const,
      label: "Implementation fee",
    },
    {
      componentType: "platform_subscription" as const,
      label: "Platform fee",
      pricingMetric: "workspace" as const,
    },
  ],
  goToMarketMotion: "sales_led" as const,
};

test("software implementation plus subscription evaluates from gross margins and derived CAC", () => {
  const payload: SoftwareImplementationPlusSubscriptionInput = {
    offerId: "implementation-offer",
    offerName: "Implementation + Subscription",
    offerType: "software_implementation_plus_subscription",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 3,
    marketingSpendPerPeriod: 9_000,
    activeCustomersStart: 30,
    retainedCustomersFromStartAtEnd: 27,
    directArpc: 2_000,
    grossMargin: 0.8,
    implementationFeePerNewCustomer: 15_000,
    implementationGrossMargin: 0.6,
    softwareConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.results.cac, 3_000);
  assert.equal(evaluation.results.arpc, 2_000);
  assert.equal(evaluation.results.churnRate, 0.1);
  assert.equal(evaluation.results.retentionRate, 0.9);
  assert.equal(evaluation.results.ltv, 35_000);
  assert.equal(evaluation.results.ltgpPerCustomer, 25_000);
  assert.equal(evaluation.results.ltgpToCacRatio, 25_000 / 3_000);
  assert.equal(evaluation.results.cacPaybackPeriods, 3_000 / 10_600);
  assert.equal(evaluation.results.hypotheticalMaxCustomers, 30);
  assert.equal(evaluation.results.hypotheticalMaxRevenuePerYear, 1_260_000);
  assert.equal(evaluation.results.hypotheticalMaxProfitPerYear, 900_000);
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Used direct subscription ARPC for recurring subscription revenue.",
    ),
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Derived implementation gross profit from implementation gross margin.",
    ),
  );
});

test("software implementation plus subscription evaluates from direct CAC, direct churn, and cost-based gross profit", () => {
  const payload: SoftwareImplementationPlusSubscriptionInput = {
    offerId: "implementation-offer",
    offerName: "Implementation + Subscription",
    offerType: "software_implementation_plus_subscription",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 3,
    cacInputMode: "direct",
    directCac: 2_500,
    activeCustomersStart: 30,
    retentionInputMode: "rate",
    directChurnRatePerPeriod: 0.12,
    directArpc: 2_000,
    grossProfitInputMode: "costs",
    deliveryCostPerCustomerPerPeriod: 250,
    fixedDeliveryCostPerPeriod: 600,
    implementationFeePerNewCustomer: 15_000,
    implementationDeliveryCostPerNewCustomer: 7_000,
    softwareConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.results.cac, 2_500);
  assert.equal(evaluation.results.arpc, 2_000);
  assert.equal(evaluation.results.churnRate, 0.12);
  assert.ok(
    Math.abs((evaluation.results.ltgpPerCustomer ?? 0) - 22_414.98316498317) < 1e-9,
  );
  assert.ok(
    Math.abs((evaluation.results.ltgpToCacRatio ?? 0) - 8.965993265993268) < 1e-9,
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Used direct CAC instead of deriving CAC from marketing spend.",
    ),
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Used direct churn rate for implementation + subscription retention.",
    ),
  );
});

test("software implementation plus subscription warns when implementation delivery costs exceed implementation fee", () => {
  const payload: SoftwareImplementationPlusSubscriptionInput = {
    offerId: "implementation-offer",
    offerName: "Implementation + Subscription",
    offerType: "software_implementation_plus_subscription",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 3,
    marketingSpendPerPeriod: 9_000,
    activeCustomersStart: 30,
    retainedCustomersFromStartAtEnd: 27,
    directArpc: 2_000,
    grossMargin: 0.8,
    implementationFeePerNewCustomer: 15_000,
    implementationDeliveryCostPerNewCustomer: 17_000,
    softwareConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.ok(
    evaluation.warnings.includes(
      "Implementation delivery costs exceed implementation fee; implementation gross profit is negative.",
    ),
  );
});

test("software implementation plus subscription normalizes into the shared mixed monetization shape", () => {
  const payload: SoftwareImplementationPlusSubscriptionInput = {
    offerId: "implementation-offer",
    offerName: "Implementation + Subscription",
    offerType: "software_implementation_plus_subscription",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 3,
    marketingSpendPerPeriod: 9_000,
    activeCustomersStart: 30,
    retainedCustomersFromStartAtEnd: 27,
    directArpc: 2_000,
    grossMargin: 0.8,
    implementationFeePerNewCustomer: 15_000,
    implementationGrossMargin: 0.6,
    softwareConfig,
  };

  const normalized = normalizeSoftwareImplementationPlusSubscriptionOffer(payload);

  assert.equal(normalized.offerType, "software_implementation_plus_subscription");
  assert.equal(normalized.forecastMode, "mixed");
  assert.equal(normalized.recurring?.activeCustomersStart, 30);
  assert.equal(normalized.recurring?.arpcPerActiveCustomerPerPeriod, 2_000);
  assert.equal(normalized.recurring?.grossProfitPerActiveCustomerPerPeriod, 1_600);
  assert.equal(normalized.oneTime?.revenuePerNewCustomer, 15_000);
  assert.equal(normalized.oneTime?.grossProfitPerNewCustomer, 9_000);
  assert.equal(normalized.forecast.hypotheticalMaxCustomers, 30);
});
