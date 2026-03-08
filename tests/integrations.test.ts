import test from "node:test";
import assert from "node:assert/strict";

import { integrationSyncPayloadSchema } from "../src/features/integrations/schema";
import {
  deriveOfferPeriodSnapshots,
  mapSnapshotToCalculatorInput,
  runIntegrationSync,
} from "../src/features/integrations/service";
import type {
  AccountMapping,
  IntegrationSource,
  IntegrationSyncPayload,
  NormalizedOfferMapping,
} from "../src/features/integrations/types";

const sources: IntegrationSource[] = [
  {
    sourceId: "src-stripe",
    provider: "stripe",
    connectionLabel: "Stripe",
    sourceKind: "payments",
    status: "connected",
  },
  {
    sourceId: "src-qb",
    provider: "quickbooks",
    connectionLabel: "QuickBooks",
    sourceKind: "accounting",
    status: "connected",
  },
];

const offerMappings: NormalizedOfferMapping[] = [
  {
    mappingId: "map-subscription",
    offerKey: "offer-subscription",
    offerName: "Imported Subscription",
    offerType: "software_subscription",
    sourceId: "src-stripe",
    externalProductKeys: ["prod_subscription"],
    externalPriceKeys: ["price_subscription"],
    revenueClassification: "subscription_base",
  },
  {
    mappingId: "map-token",
    offerKey: "offer-token",
    offerName: "Imported Token",
    offerType: "software_token_pricing",
    sourceId: "src-stripe",
    externalProductKeys: ["prod_token"],
    externalPriceKeys: ["price_token"],
    revenueClassification: "usage",
  },
];

const accountMappings: AccountMapping[] = [
  {
    accountMappingId: "acct-marketing",
    sourceId: "src-qb",
    externalAccountKey: "acct_marketing",
    mappedRole: "cac_eligible",
    expenseCategory: "marketing",
    offerKey: "offer-subscription",
  },
  {
    accountMappingId: "acct-hosting",
    sourceId: "src-qb",
    externalAccountKey: "acct_hosting",
    mappedRole: "delivery_cost",
    expenseCategory: "hosting",
    offerKey: "offer-subscription",
  },
  {
    accountMappingId: "acct-ai",
    sourceId: "src-qb",
    externalAccountKey: "acct_ai",
    mappedRole: "delivery_cost",
    expenseCategory: "ai_inference",
    offerKey: "offer-token",
  },
];

const payload: IntegrationSyncPayload = {
  window: {
    startAt: "2026-02-01T00:00:00.000Z",
    endAt: "2026-03-01T00:00:00.000Z",
    analysisPeriod: "monthly",
  },
  customers: [
    {
      customerKey: "cust-1",
      externalCustomerId: "cus_1",
      sourceId: "src-stripe",
      firstPaidAt: "2026-01-10T00:00:00.000Z",
      currentStatus: "active",
    },
    {
      customerKey: "cust-2",
      externalCustomerId: "cus_2",
      sourceId: "src-stripe",
      firstPaidAt: "2026-02-10T00:00:00.000Z",
      currentStatus: "active",
    },
    {
      customerKey: "cust-3",
      externalCustomerId: "cus_3",
      sourceId: "src-stripe",
      firstPaidAt: "2026-02-12T00:00:00.000Z",
      currentStatus: "active",
    },
  ],
  revenueEvents: [
    {
      revenueEventId: "rev-sub-1",
      sourceId: "src-stripe",
      customerKey: "cust-1",
      offerKey: null,
      externalProductKey: "prod_subscription",
      externalPriceKey: "price_subscription",
      occurredAt: "2026-02-15T00:00:00.000Z",
      servicePeriodStart: "2026-02-01T00:00:00.000Z",
      servicePeriodEnd: "2026-03-01T00:00:00.000Z",
      category: "subscription",
      grossAmount: 30_000,
      refundedAmount: 0,
      netAmount: 30_000,
      currency: "USD",
      quantity: 10,
      unitAmount: 3_000,
    },
    {
      revenueEventId: "rev-token-1",
      sourceId: "src-stripe",
      customerKey: "cust-3",
      offerKey: null,
      externalProductKey: "prod_token",
      externalPriceKey: "price_token",
      occurredAt: "2026-02-18T00:00:00.000Z",
      servicePeriodStart: "2026-02-01T00:00:00.000Z",
      servicePeriodEnd: "2026-03-01T00:00:00.000Z",
      category: "usage",
      grossAmount: 4_000,
      refundedAmount: 0,
      netAmount: 4_000,
      currency: "USD",
      quantity: 2_000,
      unitAmount: 2,
    },
  ],
  refundEvents: [
    {
      refundEventId: "refund-sub-1",
      sourceId: "src-stripe",
      customerKey: "cust-1",
      offerKey: "offer-subscription",
      occurredAt: "2026-02-20T00:00:00.000Z",
      amount: 500,
      currency: "USD",
      originalRevenueEventId: "rev-sub-1",
    },
  ],
  expenseEvents: [
    {
      expenseEventId: "exp-marketing",
      sourceId: "src-qb",
      occurredAt: "2026-02-10T00:00:00.000Z",
      amount: 4_000,
      currency: "USD",
      category: "marketing",
      mappedRole: null,
      offerKey: null,
      externalAccountKey: "acct_marketing",
    },
    {
      expenseEventId: "exp-hosting",
      sourceId: "src-qb",
      occurredAt: "2026-02-11T00:00:00.000Z",
      amount: 6_000,
      currency: "USD",
      category: "hosting",
      mappedRole: null,
      offerKey: null,
      externalAccountKey: "acct_hosting",
    },
    {
      expenseEventId: "exp-ai",
      sourceId: "src-qb",
      occurredAt: "2026-02-12T00:00:00.000Z",
      amount: 1_000,
      currency: "USD",
      category: "ai_inference",
      mappedRole: null,
      offerKey: null,
      externalAccountKey: "acct_ai",
    },
  ],
  subscriptionStates: [
    {
      subscriptionKey: "sub-1",
      sourceId: "src-stripe",
      customerKey: "cust-1",
      offerKey: null,
      externalProductKey: "prod_subscription",
      externalPriceKey: "price_subscription",
      status: "active",
      startedAt: "2026-01-10T00:00:00.000Z",
      canceledAt: null,
      currentPeriodStart: "2026-02-01T00:00:00.000Z",
      currentPeriodEnd: "2026-03-01T00:00:00.000Z",
      billingInterval: "monthly",
    },
    {
      subscriptionKey: "sub-2",
      sourceId: "src-stripe",
      customerKey: "cust-2",
      offerKey: null,
      externalProductKey: "prod_subscription",
      externalPriceKey: "price_subscription",
      status: "active",
      startedAt: "2026-02-10T00:00:00.000Z",
      canceledAt: null,
      currentPeriodStart: "2026-02-10T00:00:00.000Z",
      currentPeriodEnd: "2026-03-10T00:00:00.000Z",
      billingInterval: "monthly",
    },
    {
      subscriptionKey: "sub-3",
      sourceId: "src-stripe",
      customerKey: "cust-3",
      offerKey: null,
      externalProductKey: "prod_token",
      externalPriceKey: "price_token",
      status: "active",
      startedAt: "2026-01-12T00:00:00.000Z",
      canceledAt: null,
      currentPeriodStart: "2026-02-12T00:00:00.000Z",
      currentPeriodEnd: "2026-03-12T00:00:00.000Z",
      billingInterval: "monthly",
    },
  ],
};

test("integration sync schema accepts normalized import payloads", () => {
  const parsed = integrationSyncPayloadSchema.parse(payload);
  assert.equal(parsed.window.analysisPeriod, "monthly");
  assert.equal(parsed.revenueEvents?.length, 2);
});

test("deriveOfferPeriodSnapshots builds deterministic snapshots from mapped data", () => {
  const snapshots = deriveOfferPeriodSnapshots({
    sources,
    offerMappings,
    accountMappings,
    payload,
  });

  const subscriptionSnapshot = snapshots.find(
    (snapshot) => snapshot.offerKey === "offer-subscription",
  );
  const tokenSnapshot = snapshots.find((snapshot) => snapshot.offerKey === "offer-token");

  assert.equal(snapshots.length, 2);
  assert.equal(subscriptionSnapshot?.revenue.subscriptionRevenue, 30_000);
  assert.equal(subscriptionSnapshot?.revenue.refunds, 500);
  assert.equal(subscriptionSnapshot?.revenue.netReceipts, 29_500);
  assert.equal(subscriptionSnapshot?.customers.activeCustomersStart, 1);
  assert.equal(subscriptionSnapshot?.customers.activeCustomersEnd, 2);
  assert.equal(subscriptionSnapshot?.customers.newCustomers, 1);
  assert.equal(subscriptionSnapshot?.acquisition.cacEligibleSpend, 4_000);
  assert.equal(subscriptionSnapshot?.acquisition.directCac, 4_000);
  assert.equal(subscriptionSnapshot?.delivery.observableGrossMargin, 0.8);
  assert.equal(tokenSnapshot?.usage.totalUsageUnits, 2_000);
  assert.equal(tokenSnapshot?.usage.pricePerUsageUnit, 2);
  assert.equal(tokenSnapshot?.usage.costPerUsageUnit, 0.5);
});

test("mapSnapshotToCalculatorInput converts imported subscription snapshots into supported offer inputs", () => {
  const [subscriptionSnapshot] = deriveOfferPeriodSnapshots({
    sources,
    offerMappings: [offerMappings[0]],
    accountMappings,
    payload,
  });

  const mapped = mapSnapshotToCalculatorInput(subscriptionSnapshot);

  assert.equal(mapped.offerInput?.offerType, "software_subscription");
  assert.equal(mapped.offerInput?.revenuePerPeriod, 30_000);
  assert.equal(mapped.offerInput?.marketingSpendPerPeriod, 4_000);
  assert.equal(mapped.offerInput?.activeCustomersStart, 1);
  assert.equal(mapped.offerInput?.retainedCustomersFromStartAtEnd, 1);
  assert.ok(mapped.unmappedFields.length === 0);
});

test("mapSnapshotToCalculatorInput converts imported token snapshots into supported offer inputs", () => {
  const [, tokenSnapshot] = deriveOfferPeriodSnapshots({
    sources,
    offerMappings,
    accountMappings,
    payload,
  });

  const mapped = mapSnapshotToCalculatorInput(tokenSnapshot);

  assert.equal(mapped.offerInput?.offerType, "software_token_pricing");
  assert.equal(mapped.offerInput?.usageUnitsPerCustomerPerPeriod, 2_000);
  assert.equal(mapped.offerInput?.pricePerUsageUnit, 2);
  assert.equal(mapped.offerInput?.costPerUsageUnit, 0.5);
});

test("runIntegrationSync returns a summarized sync result and generated snapshots", () => {
  const result = runIntegrationSync({
    sources,
    offerMappings,
    accountMappings,
    payload,
  });

  assert.equal(result.window.analysisPeriod, "monthly");
  assert.equal(result.summary.sourceCount, 2);
  assert.equal(result.summary.offerCount, 2);
  assert.equal(result.summary.snapshotCount, 2);
  assert.equal(result.snapshots.length, 2);
  assert.ok(result.syncId.startsWith("sync-"));
});
