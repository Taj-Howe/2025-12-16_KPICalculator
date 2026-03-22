import test from "node:test";
import assert from "node:assert/strict";

import { evaluateKpis } from "../src/features/kpi/service";
import type { EcommerceRepeatPurchaseProductInput } from "../src/features/kpi/types";

const ecommerceConfig = {
  industryPreset: "ecommerce" as const,
  monetizationModel: "repeat_purchase" as const,
  merchandisingModel: "catalog" as const,
  fulfillmentModel: "3pl" as const,
};

test("e-commerce repeat-purchase evaluates lifetime economics from expected orders and derived CAC", () => {
  const payload: EcommerceRepeatPurchaseProductInput = {
    offerId: "repeat-sku",
    offerName: "Repeat SKU",
    offerType: "ecommerce_repeat_purchase_product",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 50,
    marketingSpendPerPeriod: 2_500,
    averageOrderValue: 60,
    grossMargin: 0.4,
    expectedOrdersPerCustomer: 3,
    ecommerceConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.results.cac, 50);
  assert.equal(evaluation.results.arpc, 60);
  assert.equal(evaluation.results.ltv, 180);
  assert.equal(evaluation.results.ltgpPerCustomer, 72);
  assert.equal(evaluation.results.ltgpToCacRatio, 1.44);
  assert.equal(evaluation.results.cacPaybackPeriods, 50 / 24);
  assert.equal(evaluation.results.hypotheticalMaxRevenuePerYear, null);
  assert.equal(evaluation.results.projectedRevenueNextYear, 108_000);
  assert.equal(evaluation.results.projectedProfitNextYear, 13_200);
  assert.ok(
    evaluation.assumptionsApplied.includes(
      "Used expected orders per customer to derive repeat-purchase lifetime value and gross profit.",
    ),
  );
});

test("e-commerce repeat-purchase evaluates from direct gross profit, refund drag, and direct CAC", () => {
  const payload: EcommerceRepeatPurchaseProductInput = {
    offerId: "repeat-sku",
    offerName: "Repeat SKU",
    offerType: "ecommerce_repeat_purchase_product",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 20,
    cacInputMode: "direct",
    directCac: 35,
    averageOrderValue: 100,
    grossProfitPerOrder: 28,
    refundsRatePerOrder: 0.1,
    expectedOrdersPerCustomer: 4,
    ecommerceConfig,
  };

  const evaluation = evaluateKpis(payload);

  assert.equal(evaluation.calculationVersion, "kpi-v2-subscription-offer-flexible-inputs");
  assert.equal(evaluation.results.cac, 35);
  assert.equal(evaluation.results.arpc, 90);
  assert.equal(evaluation.results.ltv, 360);
  assert.equal(evaluation.results.ltgpPerCustomer, 112);
  assert.equal(evaluation.results.ltgpToCacRatio, 3.2);
  assert.equal(evaluation.results.cacPaybackPeriods, 35 / 28);
  assert.equal(evaluation.results.projectedRevenueNextYear, 86_400);
  assert.equal(evaluation.results.projectedProfitNextYear, 18_480);
});
