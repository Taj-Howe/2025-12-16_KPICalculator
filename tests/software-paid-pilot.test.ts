import test from "node:test";
import assert from "node:assert/strict";

import { evaluateKpis } from "../src/features/kpi/service";
import { normalizeSoftwarePaidPilotOffer } from "../src/features/kpi/software-tech-monetization";
import type { SoftwarePaidPilotInput } from "../src/features/kpi/types";

const softwareConfig = {
  industryPreset: "software_tech" as const,
  monetizationModel: "paid_pilot" as const,
  revenueComponents: [
    {
      componentType: "pilot_fee" as const,
      label: "Pilot fee",
    },
  ],
  goToMarketMotion: "enterprise" as const,
};

test("software paid pilot evaluates from pilot gross margin and derived CAC", () => {
  const payload: SoftwarePaidPilotInput = {
    offerId: "enterprise-pilot",
    offerName: "Enterprise Pilot",
    offerType: "software_paid_pilot",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 4,
    marketingSpendPerPeriod: 8_000,
    pilotFeePerNewCustomer: 12_000,
    pilotGrossMargin: 0.75,
    softwareConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.calculationVersion, "kpi-v2-subscription-offer");
  assert.equal(evaluation.results.cac, 2_000);
  assert.equal(evaluation.results.arpc, 12_000);
  assert.equal(evaluation.results.churnRate, null);
  assert.equal(evaluation.results.retentionRate, null);
  assert.equal(evaluation.results.ltv, 12_000);
  assert.equal(evaluation.results.ltgpPerCustomer, 9_000);
  assert.equal(evaluation.results.ltgpToCacRatio, 4.5);
  assert.equal(evaluation.results.cacPaybackPeriods, 2 / 9);
  assert.equal(evaluation.results.hypotheticalMaxCustomers, null);
  assert.equal(evaluation.results.hypotheticalMaxRevenuePerYear, null);
  assert.equal(evaluation.results.hypotheticalMaxProfitPerYear, null);
  assert.equal(evaluation.results.projectedRevenueNextYear, 576_000);
  assert.equal(evaluation.results.projectedProfitNextYear, 336_000);
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Derived pilot gross profit from pilot gross margin.",
    ),
  );
});

test("software paid pilot evaluates from pilot delivery cost and direct CAC", () => {
  const payload: SoftwarePaidPilotInput = {
    offerId: "enterprise-pilot",
    offerName: "Enterprise Pilot",
    offerType: "software_paid_pilot",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 4,
    cacInputMode: "direct",
    directCac: 1_500,
    pilotFeePerNewCustomer: 12_000,
    pilotDeliveryCostPerNewCustomer: 3_000,
    softwareConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.results.cac, 1_500);
  assert.equal(evaluation.results.ltgpPerCustomer, 9_000);
  assert.equal(evaluation.results.ltgpToCacRatio, 6);
  assert.equal(evaluation.results.cacPaybackPeriods, 1 / 6);
  assert.equal(evaluation.results.projectedRevenueNextYear, 576_000);
  assert.equal(evaluation.results.projectedProfitNextYear, 360_000);
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Used direct CAC instead of deriving CAC from marketing spend.",
    ),
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Derived pilot gross profit from pilot delivery cost per new customer.",
    ),
  );
  assert.equal(evaluation.warnings.length, 0);
});

test("software paid pilot warns when CAC cannot be computed from zero new customers", () => {
  const payload: SoftwarePaidPilotInput = {
    offerId: "enterprise-pilot",
    offerName: "Enterprise Pilot",
    offerType: "software_paid_pilot",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 0,
    marketingSpendPerPeriod: 8_000,
    pilotFeePerNewCustomer: 12_000,
    pilotGrossMargin: 0.75,
    softwareConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.results.cac, null);
  assert.ok(
    evaluation.warnings.includes(
      "CAC cannot be computed (newCustomersPerPeriod is 0).",
    ),
  );
  assert.ok(
    evaluation.warnings.includes("LTGP:CAC cannot be computed (CAC is 0)."),
  );
});

test("software paid pilot normalizes into throughput economics with no recurring component", () => {
  const payload: SoftwarePaidPilotInput = {
    offerId: "enterprise-pilot",
    offerName: "Enterprise Pilot",
    offerType: "software_paid_pilot",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 4,
    marketingSpendPerPeriod: 8_000,
    pilotFeePerNewCustomer: 12_000,
    pilotGrossMargin: 0.75,
    softwareConfig,
  };

  const normalized = normalizeSoftwarePaidPilotOffer(payload);

  assert.equal(normalized.offerType, "software_paid_pilot");
  assert.equal(normalized.forecastMode, "throughput");
  assert.equal(normalized.recurring, null);
  assert.equal(normalized.oneTime?.revenuePerNewCustomer, 12_000);
  assert.equal(normalized.oneTime?.grossProfitPerNewCustomer, 9_000);
  assert.equal(normalized.forecast.projectedRevenueNextYear, 576_000);
  assert.equal(normalized.forecast.projectedProfitNextYear, 336_000);
  assert.equal(normalized.forecast.hypotheticalMaxRevenuePerYear, null);
});
