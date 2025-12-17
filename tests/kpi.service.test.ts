import test from "node:test";
import assert from "node:assert/strict";

import { evaluateKpis } from "../src/features/kpi/service";
import type { KPIInput } from "../src/features/kpi/types";

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
  };
  const evaluation = evaluateKpis(payload);
  assert.ok(
    evaluation.warnings.some((w) =>
      w.includes("Hybrid: subscription retention missing"),
    ),
  );
  assert.equal(evaluation.results.retentionRate, 0.7);
});
