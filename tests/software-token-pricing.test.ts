import test from "node:test";
import assert from "node:assert/strict";

import { evaluateKpis } from "../src/features/kpi/service";
import { normalizeSoftwareTokenPricingOffer } from "../src/features/kpi/software-tech-monetization";
import type { SoftwareTokenPricingInput } from "../src/features/kpi/types";

const softwareConfig = {
  industryPreset: "software_tech" as const,
  monetizationModel: "token_pricing" as const,
  revenueComponents: [
    {
      componentType: "token_usage" as const,
      label: "Token usage",
      tokenUnit: "1m_tokens" as const,
    },
  ],
  goToMarketMotion: "product_led" as const,
};

test("software token pricing evaluates from counts retention and derived CAC", () => {
  const payload: SoftwareTokenPricingInput = {
    offerId: "token-offer",
    offerName: "Token Offer",
    offerType: "software_token_pricing",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 5,
    marketingSpendPerPeriod: 10_000,
    activeCustomersStart: 40,
    retainedCustomersFromStartAtEnd: 36,
    usageUnitsPerCustomerPerPeriod: 2,
    pricePerUsageUnit: 1_200,
    costPerUsageUnit: 300,
    softwareConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.results.cac, 2_000);
  assert.equal(evaluation.results.arpc, 2_400);
  assert.equal(evaluation.results.churnRate, 0.1);
  assert.equal(evaluation.results.retentionRate, 0.9);
  assert.equal(evaluation.results.ltv, 18_000);
  assert.equal(evaluation.results.ltgpPerCustomer, 18_000);
  assert.equal(evaluation.results.ltgpToCacRatio, 9);
  assert.equal(evaluation.results.cacPaybackPeriods, 2_000 / 1_800);
  assert.equal(evaluation.results.hypotheticalMaxCustomers, 50);
  assert.equal(evaluation.results.hypotheticalMaxRevenuePerYear, 1_440_000);
  assert.equal(evaluation.results.hypotheticalMaxProfitPerYear, 1_080_000);
  assert.ok(
    Math.abs((evaluation.results.projectedRevenueNextYear ?? 0) - 1_276_393.9343176682) <
      1e-9,
  );
  assert.ok(
    Math.abs((evaluation.results.projectedProfitNextYear ?? 0) - 837_295.4507382511) <
      1e-9,
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Derived token ARPC from usage units per customer and price per usage unit.",
    ),
  );
});

test("software token pricing evaluates from direct CAC and direct churn rate", () => {
  const payload: SoftwareTokenPricingInput = {
    offerId: "token-offer",
    offerName: "Token Offer",
    offerType: "software_token_pricing",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 5,
    cacInputMode: "direct",
    directCac: 1_500,
    activeCustomersStart: 40,
    retentionInputMode: "rate",
    directChurnRatePerPeriod: 0.1,
    usageUnitsPerCustomerPerPeriod: 2,
    pricePerUsageUnit: 1_200,
    costPerUsageUnit: 300,
    fixedDeliveryCostPerPeriod: 900,
    softwareConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.results.cac, 1_500);
  assert.equal(evaluation.results.arpc, 2_400);
  assert.equal(evaluation.results.churnRate, 0.1);
  assert.ok(
    Math.abs((evaluation.results.ltgpPerCustomer ?? 0) - 17_777.777777777777) < 1e-9,
  );
  assert.ok(
    Math.abs((evaluation.results.ltgpToCacRatio ?? 0) - 11.851851851851851) < 1e-9,
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Used direct CAC instead of deriving CAC from marketing spend.",
    ),
  );
  assert.ok(
    evaluation.assumptionsApplied.includes("Used direct churn rate for token retention."),
  );
});

test("software token pricing warns when unit costs exceed token revenue", () => {
  const payload: SoftwareTokenPricingInput = {
    offerId: "token-offer",
    offerName: "Token Offer",
    offerType: "software_token_pricing",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 5,
    marketingSpendPerPeriod: 10_000,
    activeCustomersStart: 40,
    retainedCustomersFromStartAtEnd: 36,
    usageUnitsPerCustomerPerPeriod: 2,
    pricePerUsageUnit: 300,
    costPerUsageUnit: 500,
    softwareConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.ok(
    evaluation.warnings.includes(
      "Token delivery costs exceed revenue per customer; gross profit is negative.",
    ),
  );
});

test("software token pricing normalizes into the shared recurring monetization shape", () => {
  const payload: SoftwareTokenPricingInput = {
    offerId: "token-offer",
    offerName: "Token Offer",
    offerType: "software_token_pricing",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 5,
    marketingSpendPerPeriod: 10_000,
    activeCustomersStart: 40,
    retainedCustomersFromStartAtEnd: 36,
    usageUnitsPerCustomerPerPeriod: 2,
    pricePerUsageUnit: 1_200,
    costPerUsageUnit: 300,
    softwareConfig,
  };

  const normalized = normalizeSoftwareTokenPricingOffer(payload);

  assert.equal(normalized.offerType, "software_token_pricing");
  assert.equal(normalized.forecastMode, "recurring");
  assert.equal(normalized.oneTime, null);
  assert.equal(normalized.recurring?.activeCustomersStart, 40);
  assert.equal(normalized.recurring?.arpcPerActiveCustomerPerPeriod, 2_400);
  assert.equal(normalized.recurring?.grossProfitPerActiveCustomerPerPeriod, 1_800);
  assert.equal(normalized.recurring?.churnRatePerPeriod, 0.1);
  assert.equal(normalized.forecast.hypotheticalMaxCustomers, 50);
});
