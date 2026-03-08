import test from "node:test";
import assert from "node:assert/strict";

import { kpiInputSchema } from "../src/features/kpi/schema";
import type {
  EcommerceOneTimeProductInput,
  EcommerceRepeatPurchaseProductInput,
  EcommerceSubscriptionReplenishmentInput,
} from "../src/features/kpi/types";

test("e-commerce one-time product schema accepts the minimum supported inputs", () => {
  const payload: EcommerceOneTimeProductInput = {
    offerId: "hero-sku",
    offerName: "Hero SKU",
    offerType: "ecommerce_one_time_product",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 100,
    marketingSpendPerPeriod: 4_000,
    averageOrderValue: 80,
    grossMargin: 0.5,
    ecommerceConfig: {
      industryPreset: "ecommerce",
      monetizationModel: "one_time_product",
      merchandisingModel: "single_sku",
      fulfillmentModel: "3pl",
    },
  };

  const parsed = kpiInputSchema.parse(payload);
  assert.equal(parsed.offerType, "ecommerce_one_time_product");
});

test("e-commerce one-time product requires the matching monetization model", () => {
  const payload = {
    offerId: "hero-sku",
    offerName: "Hero SKU",
    offerType: "ecommerce_one_time_product",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 100,
    marketingSpendPerPeriod: 4_000,
    averageOrderValue: 80,
    grossMargin: 0.5,
    ecommerceConfig: {
      industryPreset: "ecommerce",
      monetizationModel: "repeat_purchase",
      merchandisingModel: "single_sku",
      fulfillmentModel: "3pl",
    },
  };

  assert.throws(
    () => kpiInputSchema.parse(payload),
    /must use the one_time_product monetization model/,
  );
});

test("e-commerce repeat-purchase schema accepts the supported lifetime-orders inputs", () => {
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
    ecommerceConfig: {
      industryPreset: "ecommerce",
      monetizationModel: "repeat_purchase",
      merchandisingModel: "catalog",
      fulfillmentModel: "3pl",
    },
  };

  const parsed = kpiInputSchema.parse(payload);
  assert.equal(parsed.offerType, "ecommerce_repeat_purchase_product");
});

test("e-commerce repeat-purchase requires the matching monetization model", () => {
  const payload = {
    offerId: "repeat-sku",
    offerName: "Repeat SKU",
    offerType: "ecommerce_repeat_purchase_product",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 50,
    marketingSpendPerPeriod: 2_500,
    averageOrderValue: 60,
    grossMargin: 0.4,
    expectedOrdersPerCustomer: 3,
    ecommerceConfig: {
      industryPreset: "ecommerce",
      monetizationModel: "one_time_product",
      merchandisingModel: "catalog",
      fulfillmentModel: "3pl",
    },
  };

  assert.throws(
    () => kpiInputSchema.parse(payload),
    /must use the repeat_purchase monetization model/,
  );
});

test("e-commerce repeat-purchase rejects repurchase-rate mode in the first implementation", () => {
  const payload = {
    offerId: "repeat-sku",
    offerName: "Repeat SKU",
    offerType: "ecommerce_repeat_purchase_product",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 50,
    marketingSpendPerPeriod: 2_500,
    averageOrderValue: 60,
    grossMargin: 0.4,
    repeatInputMode: "repurchase_rate",
    repurchaseRatePerPeriod: 0.2,
    analysisHorizonPeriods: 6,
    ecommerceConfig: {
      industryPreset: "ecommerce",
      monetizationModel: "repeat_purchase",
      merchandisingModel: "catalog",
      fulfillmentModel: "3pl",
    },
  };

  assert.throws(
    () => kpiInputSchema.parse(payload),
    /Repurchase-rate mode is defined but not implemented yet/,
  );
});

test("e-commerce replenishment schema accepts the supported recurring inputs", () => {
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
    ecommerceConfig: {
      industryPreset: "ecommerce",
      monetizationModel: "subscription_replenishment",
      merchandisingModel: "single_sku",
      fulfillmentModel: "3pl",
    },
  };

  const parsed = kpiInputSchema.parse(payload);
  assert.equal(parsed.offerType, "ecommerce_subscription_replenishment");
});

test("e-commerce replenishment requires the matching monetization model", () => {
  const payload = {
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
    ecommerceConfig: {
      industryPreset: "ecommerce",
      monetizationModel: "repeat_purchase",
      merchandisingModel: "single_sku",
      fulfillmentModel: "3pl",
    },
  };

  assert.throws(
    () => kpiInputSchema.parse(payload),
    /must use the subscription_replenishment monetization model/,
  );
});

test("staged e-commerce bundle offer remains explicitly unsupported", () => {
  const payload = {
    offerId: "bundle-sku",
    offerName: "Bundle SKU",
    offerType: "ecommerce_bundle_offer",
    analysisPeriod: "monthly",
    ecommerceConfig: {
      industryPreset: "ecommerce",
      monetizationModel: "bundle_offer",
      merchandisingModel: "bundle",
      fulfillmentModel: "3pl",
    },
  };

  assert.throws(
    () => kpiInputSchema.parse(payload),
    /E-commerce offer type 'ecommerce_bundle_offer' is defined but not implemented yet/,
  );
});
