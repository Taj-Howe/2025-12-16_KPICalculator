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

test("subscription offer v2 supports direct CAC and delivery costs", () => {
  const payload: SubscriptionOfferInput = {
    offerId: "ai-membership",
    offerName: "AI Membership",
    offerType: "subscription",
    analysisPeriod: "monthly",
    grossProfitInputMode: "costs",
    cacInputMode: "direct",
    revenuePerPeriod: 30_000,
    deliveryCostPerCustomerPerPeriod: 400,
    fixedDeliveryCostPerPeriod: 500,
    directCac: 1_200,
    newCustomersPerPeriod: 1,
    activeCustomersStart: 10,
    retainedCustomersFromStartAtEnd: 9,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(
    evaluation.calculationVersion,
    "kpi-v2-subscription-offer-flexible-inputs",
  );
  assert.equal(evaluation.results.arpc, 3_000);
  assert.equal(evaluation.results.cac, 1_200);
  assert.equal(evaluation.results.churnRate, 0.1);
  assert.equal(evaluation.results.ltv, 25_500);
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Derived gross profit from delivery costs per active customer.",
    ),
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Used direct CAC instead of deriving CAC from marketing spend.",
    ),
  );
});

test("subscription offer v2 supports direct churn rate and sales velocity", () => {
  const payload: SubscriptionOfferInput = {
    offerId: "advisory-membership",
    offerName: "Advisory Membership",
    offerType: "subscription",
    analysisPeriod: "monthly",
    grossProfitInputMode: "margin",
    cacInputMode: "derived",
    retentionInputMode: "rate",
    revenuePerPeriod: 30_000,
    grossMargin: 0.8,
    marketingSpendPerPeriod: 6_000,
    newCustomersPerPeriod: 3,
    activeCustomersStart: 10,
    directChurnRatePerPeriod: 0.1,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(
    evaluation.calculationVersion,
    "kpi-v2-subscription-offer-flexible-inputs",
  );
  assert.equal(evaluation.results.churnRate, 0.1);
  assert.equal(evaluation.results.retentionRate, 0.9);
  assert.equal(evaluation.results.cac, 2_000);
  assert.equal(evaluation.results.arpc, 2727.2727272727275);
  assert.equal(evaluation.results.ltv, 21818.18181818182);
  assert.equal(evaluation.results.hypotheticalMaxCustomers, 30);
  assert.ok(
    Math.abs(
      (evaluation.results.hypotheticalMaxRevenuePerYear ?? 0) -
        981_818.1818181818,
    ) < 1e-9,
  );
  assert.ok(
    Math.abs(
      (evaluation.results.hypotheticalMaxProfitPerYear ?? 0) -
        785_454.5454545455,
    ) < 1e-9,
  );
  assert.ok(
    Math.abs(
      (evaluation.results.projectedRevenueNextYear ?? 0) - 609_986.2143583364,
    ) < 1e-9,
  );
  assert.ok(
    Math.abs(
      (evaluation.results.projectedProfitNextYear ?? 0) - 415_988.9714866691,
    ) < 1e-9,
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Used direct churn rate for subscription retention.",
    ),
  );
});

test("subscription offer v2 supports direct price without a starting customer base", () => {
  const payload: SubscriptionOfferInput = {
    offerId: "solo-subscription",
    offerName: "Solo Subscription",
    offerType: "subscription",
    analysisPeriod: "monthly",
    revenueInputMode: "direct_arpc",
    directArpc: 3_000,
    grossProfitInputMode: "costs",
    deliveryCostPerCustomerPerPeriod: 400,
    cacInputMode: "direct",
    directCac: 1_200,
    retentionInputMode: "rate",
    directChurnRatePerPeriod: 0.1,
    newCustomersPerPeriod: 1,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(
    evaluation.calculationVersion,
    "kpi-v2-subscription-offer-flexible-inputs",
  );
  assert.equal(evaluation.results.arpc, 3_000);
  assert.equal(evaluation.results.churnRate, 0.1);
  assert.equal(evaluation.results.cac, 1_200);
  assert.equal(evaluation.results.ltgpPerCustomer, 26_000);
  assert.equal(evaluation.results.cacPaybackPeriods, 0.46153846153846156);
  assert.equal(evaluation.results.hypotheticalMaxCustomers, 10);
  assert.ok(
    Math.abs(
      (evaluation.results.hypotheticalMaxRevenuePerYear ?? 0) - 360_000,
    ) < 1e-9,
  );
  assert.ok(
    Math.abs(
      (evaluation.results.hypotheticalMaxProfitPerYear ?? 0) - 312_000,
    ) < 1e-9,
  );
  assert.ok(
    Math.abs(
      (evaluation.results.projectedRevenueNextYear ?? 0) - 155_492.417897085,
    ) < 1e-9,
  );
  assert.ok(
    Math.abs(
      (evaluation.results.projectedProfitNextYear ?? 0) - 120_360.095510807,
    ) < 1e-9,
  );
  assert.ok(
    evaluation.assumptionsApplied.includes("Used direct subscription price / ARPC."),
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Projected annual revenue and profit from direct price, churn rate, and sales velocity.",
    ),
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Assumed zero starting active customers for annual projection.",
    ),
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Derived steady-state max customers as sales velocity divided by churn.",
    ),
  );
});

test("subscription offer v2 separates steady-state max from next-year projection", () => {
  const payload: SubscriptionOfferInput = {
    offerId: "growth-subscription",
    offerName: "Growth Subscription",
    offerType: "subscription",
    analysisPeriod: "monthly",
    revenueInputMode: "direct_arpc",
    directArpc: 3_000,
    grossProfitInputMode: "margin",
    grossMargin: 0.8,
    cacInputMode: "derived",
    marketingSpendPerPeriod: 6_000,
    retentionInputMode: "rate",
    directChurnRatePerPeriod: 0.1,
    newCustomersPerPeriod: 3,
    activeCustomersStart: 10,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.results.hypotheticalMaxCustomers, 30);
  assert.ok(
    Math.abs(
      (evaluation.results.hypotheticalMaxRevenuePerYear ?? 0) -
        1_080_000,
    ) < 1e-9,
  );
  assert.ok(
    Math.abs(
      (evaluation.results.hypotheticalMaxProfitPerYear ?? 0) - 864_000,
    ) < 1e-9,
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Projected annual revenue and profit from direct price, churn rate, and sales velocity.",
    ),
  );
  assert.ok(
    Math.abs(
      (evaluation.results.projectedRevenueNextYear ?? 0) - 670_984.8357941699,
    ) < 1e-9,
  );
  assert.ok(
    Math.abs(
      (evaluation.results.projectedProfitNextYear ?? 0) - 464_787.86863533605,
    ) < 1e-9,
  );
});
