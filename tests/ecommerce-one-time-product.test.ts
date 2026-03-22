import test from "node:test";
import assert from "node:assert/strict";

import { evaluateKpis } from "../src/features/kpi/service";
import type { EcommerceOneTimeProductInput } from "../src/features/kpi/types";

const ecommerceConfig = {
  industryPreset: "ecommerce" as const,
  monetizationModel: "one_time_product" as const,
  merchandisingModel: "single_sku" as const,
  fulfillmentModel: "3pl" as const,
};

test("e-commerce one-time product evaluates from gross margin and derived CAC", () => {
  const payload: EcommerceOneTimeProductInput = {
    offerId: "hero-sku",
    offerName: "Hero SKU",
    offerType: "ecommerce_one_time_product",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 100,
    marketingSpendPerPeriod: 4_000,
    averageOrderValue: 80,
    grossMargin: 0.5,
    ecommerceConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.results.cac, 40);
  assert.equal(evaluation.results.arpc, 80);
  assert.equal(evaluation.results.ltv, 80);
  assert.equal(evaluation.results.ltgpPerCustomer, 40);
  assert.equal(evaluation.results.ltgpToCacRatio, 1);
  assert.equal(evaluation.results.cacPaybackPeriods, 1);
  assert.equal(evaluation.results.hypotheticalMaxRevenuePerYear, null);
  assert.equal(evaluation.results.hypotheticalMaxProfitPerYear, null);
  assert.equal(evaluation.results.projectedRevenueNextYear, 96_000);
  assert.equal(evaluation.results.projectedProfitNextYear, 0);
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Derived gross profit per order from gross margin.",
    ),
  );
});

test("e-commerce one-time product evaluates from direct gross profit, refund drag, and direct CAC", () => {
  const payload: EcommerceOneTimeProductInput = {
    offerId: "hero-sku",
    offerName: "Hero SKU",
    offerType: "ecommerce_one_time_product",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 100,
    cacInputMode: "direct",
    directCac: 25,
    averageOrderValue: 100,
    grossProfitPerOrder: 30,
    refundsRatePerOrder: 0.1,
    ecommerceConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.calculationVersion, "kpi-v2-subscription-offer-flexible-inputs");
  assert.equal(evaluation.results.cac, 25);
  assert.equal(evaluation.results.arpc, 90);
  assert.equal(evaluation.results.ltv, 90);
  assert.equal(evaluation.results.ltgpPerCustomer, 30);
  assert.equal(evaluation.results.ltgpToCacRatio, 1.2);
  assert.equal(evaluation.results.cacPaybackPeriods, 25 / 30);
  assert.equal(evaluation.results.projectedRevenueNextYear, 108_000);
  assert.equal(evaluation.results.projectedProfitNextYear, 6_000);
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Adjusted order revenue for refund drag before calculating lifetime and projection outputs.",
    ),
  );
  assert.ok(
    evaluation.assumptionsApplied.includes("Used direct gross profit per order."),
  );
});

test("e-commerce one-time product warns when CAC cannot be computed from zero new customers", () => {
  const payload: EcommerceOneTimeProductInput = {
    offerId: "hero-sku",
    offerName: "Hero SKU",
    offerType: "ecommerce_one_time_product",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 0,
    marketingSpendPerPeriod: 4_000,
    averageOrderValue: 80,
    grossMargin: 0.5,
    ecommerceConfig,
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
