import test from "node:test";
import assert from "node:assert/strict";

import { evaluateKpis } from "../src/features/kpi/service";
import type { KPIInput, SubscriptionOfferInput } from "../src/features/kpi/types";

const baseInput: KPIInput = {
  period: "monthly",
  businessModel: "subscription",
  revenuePerPeriod: 100_000,
  grossMargin: 0.7,
  marketingSpendPerPeriod: 20_000,
  newCustomersPerPeriod: 20,
  activeCustomersStart: 100,
};

test("subscription churn derives from retained customers", () => {
  const payload: KPIInput = {
    ...baseInput,
    retainedCustomersFromStartAtEnd: 90,
    churnedCustomersPerPeriod: undefined,
  };
  const { results } = evaluateKpis(payload);
  assert.ok(results.churnRate != null);
  assert.equal(results.churnRate?.toFixed(2), "0.10");
  assert.equal(results.retentionRate?.toFixed(2), "0.90");
});

test("subscription churn can use churned customers input", () => {
  const payload: KPIInput = {
    ...baseInput,
    retainedCustomersFromStartAtEnd: undefined,
    churnedCustomersPerPeriod: 15,
  };
  const { results, warnings } = evaluateKpis(payload);
  assert.equal(results.churnRate?.toFixed(2), "0.15");
  assert.ok(
    !warnings.some((w) =>
      w.includes("Provide either churned customers or retained-from-start"),
    ),
  );
});

test("subscription ARPC derives end customers when not provided", () => {
  const payload: KPIInput = {
    ...baseInput,
    activeCustomersEnd: undefined,
    retainedCustomersFromStartAtEnd: 90,
  };
  const { results } = evaluateKpis(payload);
  assert.equal(results.arpc && results.arpc.toFixed(3), "952.381");
});

test("transactional churn is one minus retention", () => {
  const payload: KPIInput = {
    ...baseInput,
    businessModel: "transactional",
    retainedCustomersFromStartAtEnd: undefined,
    retentionRatePerPeriod: 0.6,
    activeCustomersEnd: 120,
  };
  const { results } = evaluateKpis(payload);
  assert.equal(results.retentionRate, 0.6);
  assert.equal(results.churnRate, 0.4);
});

test("hybrid warns when subscription data missing but transactional present", () => {
  const payload: KPIInput = {
    ...baseInput,
    businessModel: "hybrid",
    retainedCustomersFromStartAtEnd: undefined,
    retentionRatePerPeriod: 0.7,
    activeCustomersEnd: 115,
  };
  const evaluation = evaluateKpis(payload);
  assert.ok(
    evaluation.warnings.some((w) =>
      w.includes("Hybrid: subscription retention missing"),
    ),
  );
  assert.equal(evaluation.results.retentionRate, 0.7);
});

test("transactional inputs require active customers at end", () => {
  const payload: KPIInput = {
    ...baseInput,
    businessModel: "transactional",
    retentionRatePerPeriod: 0.5,
  };
  assert.throws(
    () => evaluateKpis(payload),
    /Active customers at end is required for transactional and hybrid models/,
  );
});

test("hybrid inputs require active customers at end", () => {
  const payload: KPIInput = {
    ...baseInput,
    businessModel: "hybrid",
    retentionRatePerPeriod: 0.5,
  };
  assert.throws(
    () => evaluateKpis(payload),
    /Active customers at end is required for transactional and hybrid models/,
  );
});

test("subscription offer v2 returns offer calculation envelope", () => {
  const payload: SubscriptionOfferInput = {
    offerId: "core-membership",
    offerName: "Core Membership",
    offerType: "subscription",
    analysisPeriod: "monthly",
    revenuePerPeriod: 100_000,
    grossMargin: 0.7,
    marketingSpendPerPeriod: 20_000,
    newCustomersPerPeriod: 20,
    activeCustomersStart: 100,
    retainedCustomersFromStartAtEnd: 90,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.calculationVersion, "kpi-v2-subscription-offer");
  assert.equal(evaluation.results.churnRate, 0.1);
  assert.equal(evaluation.results.retentionRate, 0.9);
  assert.deepEqual(evaluation.offerResults, evaluation.results);
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Derived churned customers from retainedCustomersFromStartAtEnd.",
    ),
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Derived end customers as start + new - churned.",
    ),
  );
});

test("subscription offer v2 warns when CAC is not computable", () => {
  const payload: SubscriptionOfferInput = {
    offerId: "core-membership",
    offerName: "Core Membership",
    offerType: "subscription",
    analysisPeriod: "monthly",
    revenuePerPeriod: 100_000,
    grossMargin: 0.7,
    marketingSpendPerPeriod: 20_000,
    newCustomersPerPeriod: 0,
    activeCustomersStart: 100,
    churnedCustomersPerPeriod: 15,
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
