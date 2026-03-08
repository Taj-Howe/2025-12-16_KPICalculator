import test from "node:test";
import assert from "node:assert/strict";

import { evaluateKpis } from "../src/features/kpi/service";
import { normalizeSoftwareHybridPlatformUsageOffer } from "../src/features/kpi/software-tech-monetization";
import type { SoftwareHybridPlatformUsageInput } from "../src/features/kpi/types";

const softwareConfig = {
  industryPreset: "software_tech" as const,
  monetizationModel: "subscription_hybrid" as const,
  revenueComponents: [
    {
      componentType: "platform_subscription" as const,
      label: "Platform fee",
      pricingMetric: "workspace" as const,
    },
    {
      componentType: "usage_metered" as const,
      label: "Usage",
      unitName: "tasks",
    },
  ],
  goToMarketMotion: "product_led" as const,
};

test("software hybrid platform + usage evaluates from counts retention and derived CAC", () => {
  const payload: SoftwareHybridPlatformUsageInput = {
    offerId: "hybrid-offer",
    offerName: "Hybrid Offer",
    offerType: "software_hybrid_platform_usage",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 6,
    marketingSpendPerPeriod: 9_000,
    activeCustomersStart: 50,
    retainedCustomersFromStartAtEnd: 45,
    platformFeePerCustomerPerPeriod: 500,
    usageUnitsPerCustomerPerPeriod: 100,
    pricePerUsageUnit: 4,
    platformDeliveryCostPerCustomerPerPeriod: 100,
    costPerUsageUnit: 1.5,
    softwareConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.results.cac, 1_500);
  assert.equal(evaluation.results.arpc, 900);
  assert.equal(evaluation.results.churnRate, 0.1);
  assert.equal(evaluation.results.retentionRate, 0.9);
  assert.equal(evaluation.results.ltv, 6_500);
  assert.equal(evaluation.results.ltgpPerCustomer, 6_500);
  assert.equal(evaluation.results.ltgpToCacRatio, 6_500 / 1_500);
  assert.equal(evaluation.results.cacPaybackPeriods, 1_500 / 650);
  assert.equal(evaluation.results.hypotheticalMaxCustomers, 60);
  assert.equal(evaluation.results.hypotheticalMaxRevenuePerYear, 648_000);
  assert.equal(evaluation.results.hypotheticalMaxProfitPerYear, 468_000);
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Derived blended hybrid ARPC from platform fee plus usage revenue per customer.",
    ),
  );
});

test("software hybrid platform + usage evaluates from direct CAC and direct churn rate", () => {
  const payload: SoftwareHybridPlatformUsageInput = {
    offerId: "hybrid-offer",
    offerName: "Hybrid Offer",
    offerType: "software_hybrid_platform_usage",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 6,
    cacInputMode: "direct",
    directCac: 1_200,
    activeCustomersStart: 50,
    retentionInputMode: "rate",
    directChurnRatePerPeriod: 0.12,
    platformFeePerCustomerPerPeriod: 500,
    usageUnitsPerCustomerPerPeriod: 100,
    pricePerUsageUnit: 4,
    platformDeliveryCostPerCustomerPerPeriod: 100,
    costPerUsageUnit: 1.5,
    fixedDeliveryCostPerPeriod: 1_120,
    softwareConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.results.cac, 1_200);
  assert.equal(evaluation.results.arpc, 900);
  assert.equal(evaluation.results.churnRate, 0.12);
  assert.ok(
    Math.abs((evaluation.results.ltgpPerCustomer ?? 0) - 5_230) < 1e-9,
  );
  assert.ok(
    Math.abs((evaluation.results.ltgpToCacRatio ?? 0) - 4.358333333333333) < 1e-9,
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Used direct churn rate for hybrid platform + usage retention.",
    ),
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Used direct CAC instead of deriving CAC from marketing spend.",
    ),
  );
});

test("software hybrid platform + usage warns when delivery costs exceed blended revenue", () => {
  const payload: SoftwareHybridPlatformUsageInput = {
    offerId: "hybrid-offer",
    offerName: "Hybrid Offer",
    offerType: "software_hybrid_platform_usage",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 6,
    marketingSpendPerPeriod: 9_000,
    activeCustomersStart: 50,
    retainedCustomersFromStartAtEnd: 45,
    platformFeePerCustomerPerPeriod: 100,
    usageUnitsPerCustomerPerPeriod: 100,
    pricePerUsageUnit: 1,
    platformDeliveryCostPerCustomerPerPeriod: 250,
    costPerUsageUnit: 2,
    softwareConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.ok(
    evaluation.warnings.includes(
      "Hybrid platform + usage delivery costs exceed revenue per customer; gross profit is negative.",
    ),
  );
});

test("software hybrid platform + usage normalizes into the shared recurring monetization shape", () => {
  const payload: SoftwareHybridPlatformUsageInput = {
    offerId: "hybrid-offer",
    offerName: "Hybrid Offer",
    offerType: "software_hybrid_platform_usage",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 6,
    marketingSpendPerPeriod: 9_000,
    activeCustomersStart: 50,
    retainedCustomersFromStartAtEnd: 45,
    platformFeePerCustomerPerPeriod: 500,
    usageUnitsPerCustomerPerPeriod: 100,
    pricePerUsageUnit: 4,
    platformDeliveryCostPerCustomerPerPeriod: 100,
    costPerUsageUnit: 1.5,
    softwareConfig,
  };

  const normalized = normalizeSoftwareHybridPlatformUsageOffer(payload);

  assert.equal(normalized.offerType, "software_hybrid_platform_usage");
  assert.equal(normalized.forecastMode, "recurring");
  assert.equal(normalized.oneTime, null);
  assert.equal(normalized.recurring?.activeCustomersStart, 50);
  assert.equal(normalized.recurring?.arpcPerActiveCustomerPerPeriod, 900);
  assert.equal(normalized.recurring?.grossProfitPerActiveCustomerPerPeriod, 650);
  assert.equal(normalized.recurring?.churnRatePerPeriod, 0.1);
  assert.equal(normalized.forecast.hypotheticalMaxCustomers, 60);
});
