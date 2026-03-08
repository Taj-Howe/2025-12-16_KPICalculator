import test from "node:test";
import assert from "node:assert/strict";

import { kpiInputSchema } from "../src/features/kpi/schema";
import { evaluateKpis } from "../src/features/kpi/service";
import type {
  SoftwareHybridPlatformUsageInput,
  SoftwareImplementationPlusSubscriptionInput,
  SoftwarePaidPilotInput,
  SoftwareTokenPricingInput,
  SubscriptionOfferInput,
} from "../src/features/kpi/types";

test("software subscription offer schema accepts software monetization metadata", () => {
  const payload: SubscriptionOfferInput = {
    offerId: "software-subscription",
    offerName: "Software Subscription",
    offerType: "software_subscription",
    analysisPeriod: "monthly",
    revenuePerPeriod: 100_000,
    grossMargin: 0.8,
    marketingSpendPerPeriod: 20_000,
    newCustomersPerPeriod: 20,
    activeCustomersStart: 100,
    retainedCustomersFromStartAtEnd: 92,
    softwareConfig: {
      industryPreset: "software_tech",
      monetizationModel: "subscription_seat_based",
      revenueComponents: [
        {
          componentType: "platform_subscription",
          label: "Base platform fee",
          pricingMetric: "workspace",
        },
        {
          componentType: "seat_subscription",
          label: "Seat pricing",
          pricingMetric: "seat",
        },
      ],
      goToMarketMotion: "sales_led",
    },
  };

  const parsed = kpiInputSchema.parse(payload);
  const evaluation = evaluateKpis(payload);

  assert.equal(parsed.offerType, "software_subscription");
  assert.equal(evaluation.results.churnRate, 0.08);
  assert.equal(evaluation.calculationVersion, "kpi-v2-subscription-offer");
});

test("software subscription requires software monetization metadata", () => {
  const payload = {
    offerId: "software-subscription",
    offerName: "Software Subscription",
    offerType: "software_subscription",
    analysisPeriod: "monthly",
    revenuePerPeriod: 100_000,
    grossMargin: 0.8,
    marketingSpendPerPeriod: 20_000,
    newCustomersPerPeriod: 20,
    activeCustomersStart: 100,
    retainedCustomersFromStartAtEnd: 92,
  };

  assert.throws(
    () => kpiInputSchema.parse(payload),
    /Software subscription offers require software\/tech monetization metadata/,
  );
});

test("software paid pilot schema accepts the minimum supported pilot inputs", () => {
  const payload: SoftwarePaidPilotInput = {
    offerId: "pilot-offer",
    offerName: "Enterprise Pilot",
    offerType: "software_paid_pilot",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 4,
    marketingSpendPerPeriod: 8_000,
    pilotFeePerNewCustomer: 12_000,
    pilotGrossMargin: 0.75,
    softwareConfig: {
      industryPreset: "software_tech",
      monetizationModel: "paid_pilot",
      revenueComponents: [
        {
          componentType: "pilot_fee",
          label: "Pilot fee",
        },
      ],
      goToMarketMotion: "enterprise",
    },
  };

  const parsed = kpiInputSchema.parse(payload);
  assert.equal(parsed.offerType, "software_paid_pilot");
});

test("software paid pilot requires monetization model to be paid_pilot", () => {
  const payload = {
    offerId: "pilot-offer",
    offerName: "Enterprise Pilot",
    offerType: "software_paid_pilot",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 4,
    marketingSpendPerPeriod: 8_000,
    pilotFeePerNewCustomer: 12_000,
    pilotGrossMargin: 0.75,
    softwareConfig: {
      industryPreset: "software_tech",
      monetizationModel: "subscription_seat_based",
      revenueComponents: [
        {
          componentType: "pilot_fee",
          label: "Pilot fee",
        },
      ],
      goToMarketMotion: "enterprise",
    },
  };

  assert.throws(
    () => kpiInputSchema.parse(payload),
    /must use the paid_pilot monetization model/,
  );
});

test("software token pricing schema accepts the minimum supported token inputs", () => {
  const payload: SoftwareTokenPricingInput = {
    offerId: "token-offer",
    offerName: "Token Offer",
    offerType: "software_token_pricing",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 5,
    marketingSpendPerPeriod: 10_000,
    activeCustomersStart: 40,
    retainedCustomersFromStartAtEnd: 36,
    usageUnitsPerCustomerPerPeriod: 2,
    pricePerUsageUnit: 1_200,
    costPerUsageUnit: 300,
    softwareConfig: {
      industryPreset: "software_tech",
      monetizationModel: "token_pricing",
      revenueComponents: [
        {
          componentType: "token_usage",
          label: "Token usage",
          tokenUnit: "1m_tokens",
        },
      ],
      goToMarketMotion: "product_led",
    },
  };

  const parsed = kpiInputSchema.parse(payload);
  assert.equal(parsed.offerType, "software_token_pricing");
});

test("software token pricing requires monetization model to be token_pricing", () => {
  const payload = {
    offerId: "token-offer",
    offerName: "Token Offer",
    offerType: "software_token_pricing",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 5,
    marketingSpendPerPeriod: 10_000,
    activeCustomersStart: 40,
    retainedCustomersFromStartAtEnd: 36,
    usageUnitsPerCustomerPerPeriod: 2,
    pricePerUsageUnit: 1_200,
    costPerUsageUnit: 300,
    softwareConfig: {
      industryPreset: "software_tech",
      monetizationModel: "subscription_seat_based",
      revenueComponents: [
        {
          componentType: "token_usage",
          label: "Token usage",
          tokenUnit: "1m_tokens",
        },
      ],
      goToMarketMotion: "product_led",
    },
  };

  assert.throws(
    () => kpiInputSchema.parse(payload),
    /must use the token_pricing monetization model/,
  );
});

test("software hybrid platform + usage schema accepts the minimum supported hybrid inputs", () => {
  const payload: SoftwareHybridPlatformUsageInput = {
    offerId: "hybrid-offer",
    offerName: "Hybrid Offer",
    offerType: "software_hybrid_platform_usage",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 6,
    marketingSpendPerPeriod: 9_000,
    activeCustomersStart: 50,
    retainedCustomersFromStartAtEnd: 45,
    platformFeePerCustomerPerPeriod: 500,
    usageUnitsPerCustomerPerPeriod: 100,
    pricePerUsageUnit: 4,
    softwareConfig: {
      industryPreset: "software_tech",
      monetizationModel: "subscription_hybrid",
      revenueComponents: [
        {
          componentType: "platform_subscription",
          label: "Platform fee",
          pricingMetric: "workspace",
        },
        {
          componentType: "usage_metered",
          label: "Usage",
          unitName: "tasks",
        },
      ],
      goToMarketMotion: "product_led",
    },
  };

  const parsed = kpiInputSchema.parse(payload);
  assert.equal(parsed.offerType, "software_hybrid_platform_usage");
});

test("software hybrid platform + usage requires monetization model to be subscription_hybrid", () => {
  const payload = {
    offerId: "hybrid-offer",
    offerName: "Hybrid Offer",
    offerType: "software_hybrid_platform_usage",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 6,
    marketingSpendPerPeriod: 9_000,
    activeCustomersStart: 50,
    retainedCustomersFromStartAtEnd: 45,
    platformFeePerCustomerPerPeriod: 500,
    usageUnitsPerCustomerPerPeriod: 100,
    pricePerUsageUnit: 4,
    softwareConfig: {
      industryPreset: "software_tech",
      monetizationModel: "token_pricing",
      revenueComponents: [
        {
          componentType: "platform_subscription",
          label: "Platform fee",
          pricingMetric: "workspace",
        },
        {
          componentType: "usage_metered",
          label: "Usage",
          unitName: "tasks",
        },
      ],
      goToMarketMotion: "product_led",
    },
  };

  assert.throws(
    () => kpiInputSchema.parse(payload),
    /must use the subscription_hybrid monetization model/,
  );
});

test("software implementation plus subscription schema accepts the minimum supported mixed inputs", () => {
  const payload: SoftwareImplementationPlusSubscriptionInput = {
    offerId: "implementation-offer",
    offerName: "Implementation + Subscription",
    offerType: "software_implementation_plus_subscription",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 3,
    marketingSpendPerPeriod: 9_000,
    activeCustomersStart: 30,
    retainedCustomersFromStartAtEnd: 27,
    directArpc: 2_000,
    grossMargin: 0.8,
    implementationFeePerNewCustomer: 15_000,
    implementationGrossMargin: 0.6,
    softwareConfig: {
      industryPreset: "software_tech",
      monetizationModel: "implementation_plus_subscription",
      revenueComponents: [
        {
          componentType: "implementation_fee",
          label: "Implementation fee",
        },
        {
          componentType: "platform_subscription",
          label: "Platform fee",
          pricingMetric: "workspace",
        },
      ],
      goToMarketMotion: "sales_led",
    },
  };

  const parsed = kpiInputSchema.parse(payload);
  assert.equal(parsed.offerType, "software_implementation_plus_subscription");
});

test("software implementation plus subscription requires monetization model to be implementation_plus_subscription", () => {
  const payload = {
    offerId: "implementation-offer",
    offerName: "Implementation + Subscription",
    offerType: "software_implementation_plus_subscription",
    analysisPeriod: "monthly",
    newCustomersPerPeriod: 3,
    marketingSpendPerPeriod: 9_000,
    activeCustomersStart: 30,
    retainedCustomersFromStartAtEnd: 27,
    directArpc: 2_000,
    grossMargin: 0.8,
    implementationFeePerNewCustomer: 15_000,
    implementationGrossMargin: 0.6,
    softwareConfig: {
      industryPreset: "software_tech",
      monetizationModel: "subscription_seat_based",
      revenueComponents: [
        {
          componentType: "implementation_fee",
          label: "Implementation fee",
        },
        {
          componentType: "platform_subscription",
          label: "Platform fee",
          pricingMetric: "workspace",
        },
      ],
      goToMarketMotion: "sales_led",
    },
  };

  assert.throws(
    () => kpiInputSchema.parse(payload),
    /must use the implementation_plus_subscription monetization model/,
  );
});

test("unsupported software offer types remain unsupported", () => {
  const payload = {
    offerId: "pilot-conversion-offer",
    offerName: "Pilot Conversion Offer",
    offerType: "software_pilot_to_subscription",
    analysisPeriod: "monthly",
    softwareConfig: {
      industryPreset: "software_tech",
      monetizationModel: "pilot_to_subscription",
      revenueComponents: [
        {
          componentType: "pilot_fee",
          label: "Pilot fee",
        },
      ],
      goToMarketMotion: "sales_led",
    },
  };

  assert.throws(
    () => kpiInputSchema.parse(payload),
    /defined but not implemented yet/,
  );
});
