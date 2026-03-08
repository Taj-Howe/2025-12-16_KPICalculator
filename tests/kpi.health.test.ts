import assert from "node:assert/strict";
import test from "node:test";

import { buildHealthAssessment } from "../src/features/kpi/health";
import { evaluateKpis } from "../src/features/kpi/service";
import type { KpiEvaluation, OfferInput } from "../src/features/kpi/types";

const baseInput: OfferInput = {
  offerId: "health-subscription",
  offerName: "Health Subscription",
  offerType: "software_subscription",
  analysisPeriod: "monthly",
  revenueInputMode: "direct_arpc",
  directArpc: 1200,
  grossProfitInputMode: "margin",
  grossMargin: 0.82,
  cacInputMode: "direct",
  directCac: 900,
  retentionInputMode: "rate",
  directChurnRatePerPeriod: 0.03,
  newCustomersPerPeriod: 18,
  activeCustomersStart: 120,
  softwareConfig: {
    industryPreset: "software_tech",
    monetizationModel: "subscription_seat_based",
    revenueComponents: [
      {
        componentType: "platform_subscription",
        label: "Core platform",
        pricingMetric: "workspace",
      },
    ],
  },
};

test("health assessment marks strong recurring economics as healthy", () => {
  const evaluation = evaluateKpis(baseInput);
  const health = buildHealthAssessment(evaluation);

  assert.equal(health.status, "healthy");
  assert.ok((health.score ?? 0) >= 75);
  assert.ok(health.strengths.some((item) => item.includes("LTGP:CAC")));
});

test("health assessment marks weak LTGP:CAC as at risk", () => {
  const evaluation = evaluateKpis({
    ...baseInput,
    directCac: 6000,
    directChurnRatePerPeriod: 0.16,
    grossMargin: 0.38,
  });
  const health = buildHealthAssessment(evaluation);

  assert.equal(health.status, "at_risk");
  assert.ok((health.score ?? 100) < 45);
});

test("health assessment returns insufficient_data when signal coverage is too weak", () => {
  const evaluation: KpiEvaluation<OfferInput> = {
    inputs: baseInput,
    results: {
      cac: null,
      arpc: 1200,
      churnRate: null,
      retentionRate: null,
      ltv: null,
      ltgpPerCustomer: null,
      ltgpToCacRatio: null,
      cacPaybackPeriods: null,
      hypotheticalMaxCustomers: null,
      hypotheticalMaxRevenuePerYear: null,
      hypotheticalMaxProfitPerYear: null,
      projectedRevenueNextYear: null,
      projectedProfitNextYear: null,
      car: baseInput.newCustomersPerPeriod,
    },
    offerResults: {
      cac: null,
      arpc: 1200,
      churnRate: null,
      retentionRate: null,
      ltv: null,
      ltgpPerCustomer: null,
      ltgpToCacRatio: null,
      cacPaybackPeriods: null,
      hypotheticalMaxCustomers: null,
      hypotheticalMaxRevenuePerYear: null,
      hypotheticalMaxProfitPerYear: null,
      projectedRevenueNextYear: null,
      projectedProfitNextYear: null,
      car: baseInput.newCustomersPerPeriod,
    },
    warnings: [],
    calculationVersion: "kpi-v2-subscription-offer",
    assumptionsApplied: [],
  };
  const health = buildHealthAssessment(evaluation);

  assert.equal(health.status, "insufficient_data");
  assert.equal(health.score, null);
});
