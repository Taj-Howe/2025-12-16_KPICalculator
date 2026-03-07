import test from "node:test";
import assert from "node:assert/strict";

import { kpiInputSchema } from "../src/features/kpi/schema";
import { evaluateKpis } from "../src/features/kpi/service";
import type { SubscriptionOfferInput } from "../src/features/kpi/types";

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

test("software paid pilot is reserved but not implemented yet", () => {
  const payload = {
    offerId: "pilot-offer",
    offerName: "Enterprise Pilot",
    offerType: "software_paid_pilot",
    analysisPeriod: "monthly",
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

  assert.throws(
    () => kpiInputSchema.parse(payload),
    /defined but not implemented yet/,
  );
});
