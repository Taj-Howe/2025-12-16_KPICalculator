import assert from "node:assert/strict";
import test from "node:test";

import {
  createSampleStripeSeed,
  runSampleStripeImports,
} from "../src/features/integrations/sample-stripe";

test("createSampleStripeSeed builds a 12-month Stripe-style import seed", () => {
  const seed = createSampleStripeSeed(2025);

  assert.equal(seed.source.provider, "stripe");
  assert.equal(seed.offerMappings.length, 4);
  assert.equal(seed.payloads.length, 12);
  assert.equal(seed.payloads[0]?.window.analysisPeriod, "monthly");
});

test("runSampleStripeImports produces sync results with offer snapshots", () => {
  const results = runSampleStripeImports(2025);

  assert.equal(results.length, 12);
  for (const result of results) {
    assert.equal(result.summary.snapshotCount, 4);
    assert.equal(result.snapshots.length, 4);
  }

  const firstOfferKeys = new Set(results[0]?.snapshots.map((snapshot) => snapshot.offerKey));
  assert.deepEqual(firstOfferKeys, new Set([
    "sample-offer-core-subscription",
    "sample-offer-ai-usage",
    "sample-offer-enterprise-setup",
    "sample-offer-paid-pilot",
  ]));
});
