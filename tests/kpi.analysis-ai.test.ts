import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFallbackAiOpportunitySummary,
  createAiOpportunitySummaryInput,
  generateAiOpportunitySummary,
  isAiOpportunityProviderConfigured,
} from "../src/features/kpi/analysis-ai";
import { buildAnalysisReport } from "../src/features/kpi/analysis";
import { evaluateKpis } from "../src/features/kpi/service";
import type { SubscriptionOfferInput } from "../src/features/kpi/types";

const subscriptionConfig = {
  industryPreset: "software_tech" as const,
  monetizationModel: "subscription_seat_based" as const,
  revenueComponents: [
    {
      componentType: "platform_subscription" as const,
      label: "Platform fee",
      pricingMetric: "workspace" as const,
    },
  ],
  goToMarketMotion: "product_led" as const,
};

const subscriptionPayload: SubscriptionOfferInput = {
  offerId: "subscription-ai-analysis",
  offerName: "Subscription AI Analysis",
  offerType: "software_subscription",
  analysisPeriod: "monthly",
  revenueInputMode: "direct_arpc",
  directArpc: 3_000,
  grossProfitInputMode: "margin",
  grossMargin: 0.8,
  cacInputMode: "direct",
  directCac: 1_200,
  retentionInputMode: "rate",
  directChurnRatePerPeriod: 0.1,
  newCustomersPerPeriod: 20,
  activeCustomersStart: 100,
  softwareConfig: subscriptionConfig,
};

const buildReport = () =>
  buildAnalysisReport({
    evaluation: evaluateKpis(subscriptionPayload),
    targetMetric: "projectedProfitNextYear",
  });

test("AI summary input is derived directly from the deterministic analysis report", () => {
  const report = buildReport();
  const input = createAiOpportunitySummaryInput(report);

  assert.equal(input.targetMetric, "projectedProfitNextYear");
  assert.deepEqual(input.baseline, report.baseline);
  assert.equal(input.bestOpportunity?.scenarioId, report.bestOpportunity?.scenarioId);
  assert.equal(input.topOpportunities.length, 3);
  assert.equal(input.generatedScenarios.length, report.generatedScenarios.length);
});

test("fallback AI summary uses the deterministic top-ranked opportunity", () => {
  const report = buildReport();
  const input = createAiOpportunitySummaryInput(report);
  const summary = buildFallbackAiOpportunitySummary(input);

  assert.equal(summary.version, "ai-opportunity-summary-v1");
  assert.equal(summary.recommendedScenarioId, report.bestOpportunity?.scenarioId ?? null);
  assert.equal(summary.recommendedLever, report.bestOpportunity?.lever ?? null);
  assert.equal(
    summary.expectedImpact?.absoluteDelta,
    report.bestOpportunity?.score.absoluteDelta ?? null,
  );
  assert.deepEqual(summary.basedOnWarnings, report.bestOpportunity?.warnings ?? []);
  assert.ok(summary.whyItWon.length > 0);
});

test("AI provider may rewrite narrative but not the selected scenario or math", async () => {
  const report = buildReport();

  const summary = await generateAiOpportunitySummary({
    report,
    provider: async () => ({
      headline: "Provider headline",
      recommendation: "Provider recommendation",
      whyItWon: ["Provider reason"],
      caveats: ["Provider caveat"],
    }),
  });

  assert.equal(summary.headline, "Provider headline");
  assert.equal(summary.recommendation, "Provider recommendation");
  assert.deepEqual(summary.whyItWon, ["Provider reason"]);
  assert.deepEqual(summary.caveats, ["Provider caveat"]);
  assert.equal(summary.recommendedScenarioId, report.bestOpportunity?.scenarioId ?? null);
  assert.equal(summary.recommendedLever, report.bestOpportunity?.lever ?? null);
  assert.equal(
    summary.expectedImpact?.percentDelta,
    report.bestOpportunity?.score.percentDelta ?? null,
  );
});

test("AI summary falls back cleanly when the provider fails", async () => {
  const report = buildReport();
  const fallback = buildFallbackAiOpportunitySummary(
    createAiOpportunitySummaryInput(report),
  );

  const summary = await generateAiOpportunitySummary({
    report,
    provider: async () => {
      throw new Error("provider unavailable");
    },
  });

  assert.deepEqual(summary, fallback);
});

test("AI provider configuration helper reflects whether a provider is present", () => {
  assert.equal(isAiOpportunityProviderConfigured(), false);
  assert.equal(
    isAiOpportunityProviderConfigured(async () => ({
      headline: "x",
      recommendation: "y",
      whyItWon: [],
      caveats: [],
    })),
    true,
  );
});
