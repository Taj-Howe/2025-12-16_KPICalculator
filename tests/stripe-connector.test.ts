import test from "node:test";
import assert from "node:assert/strict";

import {
  pullStripeNormalizedPayload,
  verifyStripeApiKey,
} from "../src/features/integrations/stripe";
import type {
  ImportWindow,
  NormalizedOfferMapping,
  StripeSourceConfig,
} from "../src/features/integrations/types";

const sourceConfig: StripeSourceConfig = {
  sourceId: "src-stripe",
  secretApiKey: "sk_test_1234",
  apiKeyHint: "1234",
};

const window: ImportWindow = {
  startAt: "2026-02-01T00:00:00.000Z",
  endAt: "2026-03-01T00:00:00.000Z",
  analysisPeriod: "monthly",
};

const offerMappings: NormalizedOfferMapping[] = [
  {
    mappingId: "map-subscription",
    offerKey: "offer-subscription",
    offerName: "Stripe Subscription",
    offerType: "software_subscription",
    sourceId: "src-stripe",
    externalProductKeys: ["prod_subscription"],
    externalPriceKeys: ["price_subscription"],
    revenueClassification: "subscription_base",
  },
  {
    mappingId: "map-usage",
    offerKey: "offer-token",
    offerName: "Stripe Usage",
    offerType: "software_token_pricing",
    sourceId: "src-stripe",
    externalProductKeys: ["prod_usage"],
    externalPriceKeys: ["price_usage"],
    revenueClassification: "usage",
  },
];

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

test("verifyStripeApiKey succeeds when Stripe account endpoint returns ok", async () => {
  await verifyStripeApiKey({
    apiKey: sourceConfig.secretApiKey,
    fetchImpl: async (input) => {
      const url = String(input);
      assert.ok(url.includes("/v1/account"));
      return jsonResponse({ id: "acct_123" });
    },
  });
});

test("pullStripeNormalizedPayload normalizes invoices, refunds, and subscriptions", async () => {
  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(String(input));

    if (url.pathname === "/v1/invoices") {
      return jsonResponse({
        object: "list",
        has_more: false,
        data: [
          {
            id: "in_sub",
            customer: "cus_sub",
            currency: "usd",
            created: 1_707_048_000,
            status_transitions: { paid_at: 1_707_134_400 },
          },
          {
            id: "in_usage",
            customer: "cus_usage",
            currency: "usd",
            created: 1_707_048_100,
            status_transitions: { paid_at: 1_707_134_500 },
          },
        ],
      });
    }

    if (url.pathname === "/v1/invoices/in_sub/lines") {
      return jsonResponse({
        object: "list",
        has_more: false,
        data: [
          {
            id: "line_sub",
            amount: 30_000,
            currency: "usd",
            quantity: 10,
            period: { start: 1_706_745_600, end: 1_709_164_800 },
            price: {
              id: "price_subscription",
              product: "prod_subscription",
              unit_amount: 3_000,
            },
          },
        ],
      });
    }

    if (url.pathname === "/v1/invoices/in_usage/lines") {
      return jsonResponse({
        object: "list",
        has_more: false,
        data: [
          {
            id: "line_usage",
            amount: 4_000,
            currency: "usd",
            quantity: 2_000,
            period: { start: 1_706_745_600, end: 1_709_164_800 },
            price: {
              id: "price_usage",
              product: "prod_usage",
              unit_amount: 2,
            },
          },
        ],
      });
    }

    if (url.pathname === "/v1/refunds") {
      return jsonResponse({
        object: "list",
        has_more: false,
        data: [
          {
            id: "re_123",
            amount: 500,
            currency: "usd",
            created: 1_707_220_800,
            charge: {
              id: "ch_123",
              invoice: {
                id: "in_sub",
                lines: {
                  data: [
                    {
                      id: "line_sub",
                      price: {
                        id: "price_subscription",
                        product: "prod_subscription",
                      },
                    },
                  ],
                },
              },
            },
          },
        ],
      });
    }

    if (url.pathname === "/v1/subscriptions") {
      return jsonResponse({
        object: "list",
        has_more: false,
        data: [
          {
            id: "sub_123",
            customer: "cus_sub",
            status: "active",
            start_date: 1_705_622_400,
            canceled_at: null,
            current_period_start: 1_706_745_600,
            current_period_end: 1_709_164_800,
            items: {
              data: [
                {
                  price: {
                    id: "price_subscription",
                    product: "prod_subscription",
                  },
                },
              ],
            },
          },
          {
            id: "sub_usage_123",
            customer: "cus_usage",
            status: "active",
            start_date: 1_705_622_500,
            canceled_at: null,
            current_period_start: 1_706_745_600,
            current_period_end: 1_709_164_800,
            items: {
              data: [
                {
                  price: {
                    id: "price_usage",
                    product: "prod_usage",
                  },
                },
              ],
            },
          },
        ],
      });
    }

    throw new Error(`Unexpected Stripe request: ${url.pathname}`);
  };

  const payload = await pullStripeNormalizedPayload({
    sourceConfig,
    window,
    offerMappings,
    fetchImpl,
  });

  assert.equal(payload.window.analysisPeriod, "monthly");
  assert.equal(payload.revenueEvents?.length, 2);
  assert.equal(payload.refundEvents?.length, 1);
  assert.equal(payload.subscriptionStates?.length, 2);
  assert.equal(payload.customers?.length, 2);

  const subscriptionRevenue = payload.revenueEvents?.find(
    (event) => event.offerKey === "offer-subscription",
  );
  const usageRevenue = payload.revenueEvents?.find(
    (event) => event.offerKey === "offer-token",
  );
  const refund = payload.refundEvents?.[0];
  const subscriptionState = payload.subscriptionStates?.find(
    (state) => state.offerKey === "offer-subscription",
  );

  assert.equal(subscriptionRevenue?.category, "subscription");
  assert.equal(subscriptionRevenue?.grossAmount, 300);
  assert.equal(subscriptionRevenue?.unitAmount, 30);
  assert.equal(usageRevenue?.category, "usage");
  assert.equal(usageRevenue?.grossAmount, 40);
  assert.equal(usageRevenue?.quantity, 2_000);
  assert.equal(refund?.offerKey, "offer-subscription");
  assert.equal(refund?.amount, 5);
  assert.equal(subscriptionState?.billingInterval, "monthly");
});
