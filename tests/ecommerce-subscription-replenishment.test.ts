import test from "node:test";
import assert from "node:assert/strict";

import { evaluateKpis } from "../src/features/kpi/service";
import type { EcommerceSubscriptionReplenishmentInput } from "../src/features/kpi/types";

const ecommerceConfig = {
  industryPreset: "ecommerce" as const,
  monetizationModel: "subscription_replenishment" as const,
  merchandisingModel: "single_sku" as const,
  fulfillmentModel: "3pl" as const,
};

test("e-commerce replenishment evaluates from counts retention and derived CAC", () => {
  const payload: EcommerceSubscriptionReplenishmentInput = {
    offerId: "replenishment-sku",
    offerName: "Replenishment SKU",
    offerType: "ecommerce_subscription_replenishment",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 30,
    marketingSpendPerPeriod: 1_800,
    averageOrderValue: 40,
    grossMargin: 0.45,
    activeCustomersStart: 120,
    retainedCustomersFromStartAtEnd: 108,
    ecommerceConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.results.cac, 60);
  assert.equal(evaluation.results.arpc, 40);
  assert.equal(evaluation.results.churnRate, 0.1);
  assert.equal(evaluation.results.retentionRate, 0.9);
  assert.equal(evaluation.results.ltv, 180);
  assert.equal(evaluation.results.ltgpPerCustomer, 180);
  assert.equal(evaluation.results.ltgpToCacRatio, 3);
  assert.equal(evaluation.results.cacPaybackPeriods, 60 / 18);
  assert.equal(evaluation.results.hypotheticalMaxCustomers, 300);
  assert.equal(evaluation.results.hypotheticalMaxRevenuePerYear, 144_000);
  assert.equal(evaluation.results.hypotheticalMaxProfitPerYear, 64_800);
  assert.equal(evaluation.results.projectedRevenueNextYear, 94_918.18029530038);
  assert.equal(evaluation.results.projectedProfitNextYear, 21_113.181132885176);
});

test("e-commerce replenishment supports direct churn rate, direct CAC, direct gross profit, and multi-order periods", () => {
  const payload: EcommerceSubscriptionReplenishmentInput = {
    offerId: "replenishment-sku",
    offerName: "Replenishment SKU",
    offerType: "ecommerce_subscription_replenishment",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 20,
    cacInputMode: "direct",
    directCac: 45,
    averageOrderValue: 30,
    ordersPerSubscriberPerPeriod: 2,
    grossProfitPerSubscriberPerPeriod: 22,
    refundsRatePerPeriod: 0.1,
    activeCustomersStart: 100,
    retentionInputMode: "rate",
    directChurnRatePerPeriod: 0.08,
    ecommerceConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.calculationVersion, "kpi-v2-subscription-offer-flexible-inputs");
  assert.equal(evaluation.results.cac, 45);
  assert.equal(evaluation.results.arpc, 54);
  assert.equal(evaluation.results.churnRate, 0.08);
  assert.equal(evaluation.results.retentionRate, 0.92);
  assert.equal(evaluation.results.ltv, 275);
  assert.equal(evaluation.results.ltgpPerCustomer, 275);
  assert.equal(evaluation.results.ltgpToCacRatio, 275 / 45);
  assert.equal(evaluation.results.cacPaybackPeriods, 45 / 22);
  assert.equal(evaluation.results.hypotheticalMaxCustomers, 250);
  assert.equal(evaluation.results.hypotheticalMaxRevenuePerYear, 162_000);
  assert.equal(evaluation.results.hypotheticalMaxProfitPerYear, 66_000);
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Derived recurring subscriber revenue from average order value multiplied by orders per subscriber per period.",
    ),
  );
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Used direct gross profit per subscriber per period.",
    ),
  );
});
