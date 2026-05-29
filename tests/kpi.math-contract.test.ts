import test from "node:test";
import assert from "node:assert/strict";

import { evaluateKpis } from "../src/features/kpi/service";
import { mapSnapshotToCalculatorInput } from "../src/features/integrations/service";
import type { NormalizedOfferPeriodSnapshot } from "../src/features/integrations/types";
import type {
  EcommerceOneTimeProductInput,
  EcommerceRepeatPurchaseProductInput,
  EcommerceSubscriptionReplenishmentInput,
  KPIInput,
  SoftwareHybridPlatformUsageInput,
  SoftwareImplementationPlusSubscriptionInput,
  SoftwarePaidPilotInput,
  SoftwareTokenPricingInput,
  SubscriptionOfferInput,
} from "../src/features/kpi/types";

const approxEqual = (actual: number | null, expected: number, delta = 1e-9) => {
  assert.ok(actual != null, "Value should not be null");
  assert.ok(
    Math.abs(actual - expected) <= delta,
    `Expected ${actual} ~ ${expected}`,
  );
};

const softwareConfig = {
  industryPreset: "software_tech" as const,
  monetizationModel: "subscription_seat_based" as const,
  revenueComponents: [
    {
      componentType: "platform_subscription" as const,
      label: "Subscription",
      pricingMetric: "workspace" as const,
    },
  ],
};

const ecommerceConfig = {
  industryPreset: "ecommerce" as const,
  monetizationModel: "one_time_product" as const,
};

test("math contract: legacy subscription separates LTV revenue from LTGP", () => {
  const input: KPIInput = {
    period: "monthly",
    businessModel: "subscription",
    revenuePerPeriod: 1_000,
    grossMargin: 0.5,
    marketingSpendPerPeriod: 100,
    newCustomersPerPeriod: 1,
    activeCustomersStart: 10,
    churnedCustomersPerPeriod: 1,
  };

  const evaluation = evaluateKpis(input);

  assert.equal(evaluation.results.arpc, 100);
  assert.equal(evaluation.results.cac, 100);
  assert.equal(evaluation.results.churnRate, 0.1);
  assert.equal(evaluation.results.ltv, 1_000);
  assert.equal(evaluation.results.ltgpPerCustomer, 500);
  assert.equal(evaluation.results.ltgpToCacRatio, 5);
});

test("math contract: legacy transactional separates LTV revenue from LTGP", () => {
  const input: KPIInput = {
    period: "monthly",
    businessModel: "transactional",
    revenuePerPeriod: 1_000,
    grossMargin: 0.5,
    marketingSpendPerPeriod: 100,
    newCustomersPerPeriod: 1,
    activeCustomersStart: 10,
    activeCustomersEnd: 10,
    retentionRatePerPeriod: 0.5,
  };

  const evaluation = evaluateKpis(input);

  assert.equal(evaluation.results.arpc, 100);
  assert.equal(evaluation.results.churnRate, 0.5);
  assert.equal(evaluation.results.ltv, 200);
  assert.equal(evaluation.results.ltgpPerCustomer, 100);
});

test("math contract: legacy hybrid can fall back to transactional lifetime semantics", () => {
  const input: KPIInput = {
    period: "monthly",
    businessModel: "hybrid",
    revenuePerPeriod: 1_000,
    grossMargin: 0.5,
    marketingSpendPerPeriod: 100,
    newCustomersPerPeriod: 1,
    activeCustomersStart: 10,
    activeCustomersEnd: 10,
    retentionRatePerPeriod: 0.5,
  };

  const evaluation = evaluateKpis(input);

  assert.equal(evaluation.results.ltv, 200);
  assert.equal(evaluation.results.ltgpPerCustomer, 100);
  assert.ok(
    evaluation.warnings.includes(
      "Hybrid: subscription retention missing; subscription churn not computed.",
    ),
  );
});

test("math contract: software subscription ARPC is recurring per active customer", () => {
  const input: SubscriptionOfferInput = {
    offerId: "software-subscription",
    offerName: "Software Subscription",
    offerType: "software_subscription",
    analysisPeriod: "monthly",
    revenueInputMode: "direct_arpc",
    directArpc: 100,
    grossProfitInputMode: "margin",
    grossMargin: 0.5,
    cacInputMode: "direct",
    directCac: 50,
    retentionInputMode: "rate",
    directChurnRatePerPeriod: 0.1,
    newCustomersPerPeriod: 2,
    activeCustomersStart: 10,
    softwareConfig,
  };

  const evaluation = evaluateKpis(input);

  assert.equal(evaluation.results.arpc, 100);
  assert.equal(evaluation.results.ltv, 1_000);
  assert.equal(evaluation.results.ltgpPerCustomer, 500);
  assert.equal(evaluation.results.hypotheticalMaxCustomers, 20);
  assert.equal(evaluation.results.hypotheticalMaxRevenuePerYear, 24_000);
});

test("math contract: software paid pilot stays one-time throughput", () => {
  const input: SoftwarePaidPilotInput = {
    offerId: "paid-pilot",
    offerName: "Paid Pilot",
    offerType: "software_paid_pilot",
    analysisPeriod: "monthly",
    softwareConfig: {
      ...softwareConfig,
      monetizationModel: "paid_pilot",
      revenueComponents: [{ componentType: "pilot_fee", label: "Pilot" }],
    },
    newCustomersPerPeriod: 2,
    marketingSpendPerPeriod: 100,
    pilotFeePerNewCustomer: 500,
    pilotGrossMargin: 0.4,
  };

  const evaluation = evaluateKpis(input);

  assert.equal(evaluation.results.arpc, 500);
  assert.equal(evaluation.results.ltv, 500);
  assert.equal(evaluation.results.ltgpPerCustomer, 200);
  assert.equal(evaluation.results.projectedRevenueNextYear, 12_000);
  assert.equal(evaluation.results.projectedProfitNextYear, 3_600);
});

test("math contract: software token pricing uses recurring usage ARPC", () => {
  const input: SoftwareTokenPricingInput = {
    offerId: "token",
    offerName: "Token",
    offerType: "software_token_pricing",
    analysisPeriod: "monthly",
    softwareConfig: {
      ...softwareConfig,
      monetizationModel: "token_pricing",
      revenueComponents: [
        { componentType: "token_usage", label: "Tokens", tokenUnit: "1m_tokens" },
      ],
    },
    newCustomersPerPeriod: 2,
    marketingSpendPerPeriod: 100,
    activeCustomersStart: 10,
    retainedCustomersFromStartAtEnd: 9,
    usageUnitsPerCustomerPerPeriod: 10,
    pricePerUsageUnit: 10,
    costPerUsageUnit: 4,
  };

  const evaluation = evaluateKpis(input);

  assert.equal(evaluation.results.arpc, 100);
  assert.equal(evaluation.results.ltv, 1_000);
  assert.equal(evaluation.results.ltgpPerCustomer, 600);
});

test("math contract: software platform plus usage blends recurring ARPC", () => {
  const input: SoftwareHybridPlatformUsageInput = {
    offerId: "hybrid",
    offerName: "Hybrid",
    offerType: "software_hybrid_platform_usage",
    analysisPeriod: "monthly",
    softwareConfig: {
      ...softwareConfig,
      monetizationModel: "subscription_hybrid",
      revenueComponents: [
        { componentType: "platform_subscription", label: "Platform" },
        { componentType: "usage_metered", label: "Usage", unitName: "unit" },
      ],
    },
    newCustomersPerPeriod: 2,
    marketingSpendPerPeriod: 100,
    activeCustomersStart: 10,
    retainedCustomersFromStartAtEnd: 9,
    platformFeePerCustomerPerPeriod: 70,
    platformDeliveryCostPerCustomerPerPeriod: 10,
    usageUnitsPerCustomerPerPeriod: 3,
    pricePerUsageUnit: 10,
    costPerUsageUnit: 5,
  };

  const evaluation = evaluateKpis(input);

  assert.equal(evaluation.results.arpc, 100);
  assert.equal(evaluation.results.ltv, 1_000);
  assert.equal(evaluation.results.ltgpPerCustomer, 750);
});

test("math contract: implementation plus subscription combines recurring and one-time lifetime economics", () => {
  const input: SoftwareImplementationPlusSubscriptionInput = {
    offerId: "implementation",
    offerName: "Implementation",
    offerType: "software_implementation_plus_subscription",
    analysisPeriod: "monthly",
    softwareConfig: {
      ...softwareConfig,
      monetizationModel: "implementation_plus_subscription",
      revenueComponents: [
        { componentType: "implementation_fee", label: "Implementation" },
        { componentType: "platform_subscription", label: "Subscription" },
      ],
    },
    newCustomersPerPeriod: 2,
    marketingSpendPerPeriod: 100,
    activeCustomersStart: 10,
    retainedCustomersFromStartAtEnd: 9,
    directArpc: 100,
    grossMargin: 0.5,
    implementationFeePerNewCustomer: 300,
    implementationGrossMargin: 0.4,
  };

  const evaluation = evaluateKpis(input);

  assert.equal(evaluation.results.arpc, 100);
  assert.equal(evaluation.results.ltv, 1_300);
  assert.equal(evaluation.results.ltgpPerCustomer, 620);
});

test("math contract: e-commerce one-time product stays one-time", () => {
  const input: EcommerceOneTimeProductInput = {
    offerId: "sku",
    offerName: "SKU",
    offerType: "ecommerce_one_time_product",
    analysisPeriod: "monthly",
    ecommerceConfig,
    newCustomersPerPeriod: 2,
    marketingSpendPerPeriod: 100,
    averageOrderValue: 100,
    grossMargin: 0.5,
  };

  const evaluation = evaluateKpis(input);

  assert.equal(evaluation.results.arpc, 100);
  assert.equal(evaluation.results.ltv, 100);
  assert.equal(evaluation.results.ltgpPerCustomer, 50);
});

test("math contract: e-commerce repeat purchase separates order revenue from lifetime revenue", () => {
  const input: EcommerceRepeatPurchaseProductInput = {
    offerId: "repeat",
    offerName: "Repeat",
    offerType: "ecommerce_repeat_purchase_product",
    analysisPeriod: "monthly",
    ecommerceConfig: { ...ecommerceConfig, monetizationModel: "repeat_purchase" },
    newCustomersPerPeriod: 2,
    marketingSpendPerPeriod: 100,
    averageOrderValue: 100,
    grossMargin: 0.5,
    expectedOrdersPerCustomer: 3,
  };

  const evaluation = evaluateKpis(input);

  assert.equal(evaluation.results.arpc, 100);
  assert.equal(evaluation.results.ltv, 300);
  assert.equal(evaluation.results.ltgpPerCustomer, 150);
});

test("math contract: e-commerce replenishment uses recurring subscriber ARPC", () => {
  const input: EcommerceSubscriptionReplenishmentInput = {
    offerId: "replenishment",
    offerName: "Replenishment",
    offerType: "ecommerce_subscription_replenishment",
    analysisPeriod: "monthly",
    ecommerceConfig: {
      ...ecommerceConfig,
      monetizationModel: "subscription_replenishment",
    },
    newCustomersPerPeriod: 2,
    marketingSpendPerPeriod: 100,
    averageOrderValue: 100,
    grossMargin: 0.5,
    activeCustomersStart: 10,
    retainedCustomersFromStartAtEnd: 9,
  };

  const evaluation = evaluateKpis(input);

  assert.equal(evaluation.results.arpc, 100);
  assert.equal(evaluation.results.ltv, 1_000);
  assert.equal(evaluation.results.ltgpPerCustomer, 500);
});

test("math contract: imported mixed offers keep recurring revenue separate from implementation revenue", () => {
  const snapshot: NormalizedOfferPeriodSnapshot = {
    snapshotId: "snapshot",
    offerKey: "enterprise",
    offerName: "Enterprise",
    offerType: "software_implementation_plus_subscription",
    analysisPeriod: "monthly",
    windowStart: "2026-01-01T00:00:00.000Z",
    windowEnd: "2026-02-01T00:00:00.000Z",
    revenue: {
      grossReceipts: 1_650,
      refunds: null,
      netReceipts: 1_650,
      recognizedRevenueApprox: 1_650,
      subscriptionRevenue: 1_050,
      usageRevenue: null,
      pilotRevenue: null,
      implementationRevenue: 600,
    },
    customers: {
      activeCustomersStart: 10,
      activeCustomersEnd: 11,
      newCustomers: 2,
      retainedFromStart: 9,
      churnedFromStart: 1,
      directChurnRate: 0.1,
    },
    acquisition: {
      marketingSpend: 100,
      salesSpend: null,
      cacEligibleSpend: 100,
      directCac: 50,
    },
    delivery: {
      cogs: null,
      processorFees: null,
      hostingCost: null,
      aiInferenceCost: null,
      supportCost: null,
      implementationCost: null,
      observableGrossMargin: 0.5,
    },
    usage: {
      totalUsageUnits: null,
      usageUnitsPerCustomer: null,
      pricePerUsageUnit: null,
      costPerUsageUnit: null,
    },
    quality: {
      dataCompleteness: "high",
      missingFields: [],
      assumptions: [],
      warnings: [],
    },
  };

  const mapped = mapSnapshotToCalculatorInput(snapshot);

  assert.equal(mapped.offerInput?.offerType, "software_implementation_plus_subscription");
  assert.equal(mapped.offerInput?.implementationFeePerNewCustomer, 300);
  if (mapped.offerInput?.offerType !== "software_implementation_plus_subscription") {
    assert.fail("Expected a mixed software offer input.");
  }
  assert.equal(mapped.offerInput.directArpc, 100);

  const evaluation = evaluateKpis(mapped.offerInput);
  approxEqual(evaluation.results.ltv, 1_300);
  approxEqual(evaluation.results.ltgpPerCustomer, 650);
});
