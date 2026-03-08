import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAnalysisReport,
  buildAnalysisExport,
  buildAnalysisScenarioRows,
  buildMetricDeltas,
  createAnalysisBaselineSnapshot,
  createScenarioDefinition,
  evaluateScenario,
  getApplicableAnalysisLevers,
  rankScenarioEvaluations,
} from "../src/features/kpi/analysis";
import { evaluateKpis } from "../src/features/kpi/service";
import type {
  SoftwarePaidPilotInput,
  SubscriptionOfferInput,
} from "../src/features/kpi/types";

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

const paidPilotConfig = {
  industryPreset: "software_tech" as const,
  monetizationModel: "paid_pilot" as const,
  revenueComponents: [
    {
      componentType: "pilot_fee" as const,
      label: "Pilot fee",
    },
  ],
  goToMarketMotion: "enterprise" as const,
};

const directSubscriptionPayload: SubscriptionOfferInput = {
  offerId: "subscription-analysis",
  offerName: "Subscription Analysis",
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

const countBasedSubscriptionPayload: SubscriptionOfferInput = {
  offerId: "count-subscription-analysis",
  offerName: "Count Subscription Analysis",
  offerType: "software_subscription",
  analysisPeriod: "monthly",
  revenueInputMode: "direct_arpc",
  directArpc: 3_000,
  grossProfitInputMode: "margin",
  grossMargin: 0.8,
  cacInputMode: "direct",
  directCac: 1_200,
  retentionInputMode: "counts",
  activeCustomersStart: 100,
  retainedCustomersFromStartAtEnd: 90,
  newCustomersPerPeriod: 20,
  softwareConfig: subscriptionConfig,
};

const paidPilotPayload: SoftwarePaidPilotInput = {
  offerId: "pilot-analysis",
  offerName: "Pilot Analysis",
  offerType: "software_paid_pilot",
  analysisPeriod: "monthly",
  newCustomersPerPeriod: 4,
  marketingSpendPerPeriod: 8_000,
  pilotFeePerNewCustomer: 12_000,
  pilotGrossMargin: 0.75,
  softwareConfig: paidPilotConfig,
};

test("analysis baseline snapshot preserves the supported software offer evaluation", () => {
  const evaluation = evaluateKpis(directSubscriptionPayload);
  const baseline = createAnalysisBaselineSnapshot(
    evaluation,
    "2026-03-07T00:00:00.000Z",
  );

  assert.equal(baseline.generatedAt, "2026-03-07T00:00:00.000Z");
  assert.equal(baseline.offerType, "software_subscription");
  assert.equal(baseline.calculationVersion, evaluation.calculationVersion);
  assert.deepEqual(baseline.inputs, directSubscriptionPayload);
  assert.deepEqual(baseline.results, evaluation.results);
  assert.deepEqual(baseline.warnings, evaluation.warnings);
  assert.deepEqual(baseline.assumptionsApplied, evaluation.assumptionsApplied);
});

test("analysis churn scenarios synthesize retained cohort counts for count-based recurring inputs", () => {
  const baseline = createAnalysisBaselineSnapshot(
    evaluateKpis(countBasedSubscriptionPayload),
    "2026-03-07T00:00:00.000Z",
  );

  const scenario = createScenarioDefinition({
    baseline,
    lever: "churn",
    mode: "percent",
    amount: -0.1,
  });
  const evaluation = evaluateScenario({
    baseline,
    scenario,
    targetMetric: "projectedProfitNextYear",
  });

  assert.equal(scenario.fieldPath, "retainedCustomersFromStartAtEnd");
  assert.equal(scenario.baselineValue, 0.1);
  assert.ok(Math.abs((scenario.scenarioValue ?? 0) - 0.09) < 1e-9);
  assert.equal(evaluation.valid, true);
  assert.equal(evaluation.inputs?.retainedCustomersFromStartAtEnd, 91);
  assert.equal(evaluation.inputs?.churnedCustomersPerPeriod, undefined);
  assert.ok(Math.abs((evaluation.results?.churnRate ?? 0) - 0.09) < 1e-9);
});

test("analysis CAC scenarios for derived CAC mutate spend while preserving CAC semantics", () => {
  const baseline = createAnalysisBaselineSnapshot(
    evaluateKpis(paidPilotPayload),
    "2026-03-07T00:00:00.000Z",
  );

  const scenario = createScenarioDefinition({
    baseline,
    lever: "cac",
    mode: "percent",
    amount: -0.1,
  });
  const evaluation = evaluateScenario({
    baseline,
    scenario,
    targetMetric: "projectedProfitNextYear",
  });

  assert.equal(scenario.fieldPath, "marketingSpendPerPeriod");
  assert.equal(scenario.baselineValue, 2_000);
  assert.equal(scenario.scenarioValue, 1_800);
  assert.equal(evaluation.valid, true);
  assert.equal(evaluation.inputs?.marketingSpendPerPeriod, 7_200);
  assert.equal(evaluation.results?.cac, 1_800);
});

test("analysis builds metric deltas from baseline to scenario outputs", () => {
  const baselineEvaluation = evaluateKpis(directSubscriptionPayload);
  const baseline = createAnalysisBaselineSnapshot(
    baselineEvaluation,
    "2026-03-07T00:00:00.000Z",
  );
  const scenario = createScenarioDefinition({
    baseline,
    lever: "price",
    mode: "percent",
    amount: 0.1,
  });
  const scenarioEvaluation = evaluateScenario({
    baseline,
    scenario,
    targetMetric: "projectedProfitNextYear",
  });

  const deltas = buildMetricDeltas(baseline.results, scenarioEvaluation.results);
  const arpcDelta = deltas.find((delta) => delta.metric === "arpc");
  const projectedProfitDelta = deltas.find(
    (delta) => delta.metric === "projectedProfitNextYear",
  );

  assert.equal(arpcDelta?.metric, "arpc");
  assert.equal(arpcDelta?.baseline, 3_000);
  assert.ok(Math.abs((arpcDelta?.scenario ?? 0) - 3_300) < 1e-9);
  assert.ok(Math.abs((arpcDelta?.absoluteDelta ?? 0) - 300) < 1e-9);
  assert.ok(Math.abs((arpcDelta?.percentDelta ?? 0) - 0.1) < 1e-9);
  assert.equal(projectedProfitDelta?.baseline, baseline.results.projectedProfitNextYear);
  assert.ok((projectedProfitDelta?.absoluteDelta ?? 0) > 0);
});

test("analysis ranking prefers larger improvements for lower-is-better metrics", () => {
  const baseline = createAnalysisBaselineSnapshot(
    evaluateKpis(directSubscriptionPayload),
    "2026-03-07T00:00:00.000Z",
  );

  const smallerGain = evaluateScenario({
    baseline,
    scenario: createScenarioDefinition({
      baseline,
      lever: "gross_margin",
      mode: "percent",
      amount: 0.05,
    }),
    targetMetric: "cacPaybackPeriods",
  });
  const largerGain = evaluateScenario({
    baseline,
    scenario: createScenarioDefinition({
      baseline,
      lever: "gross_margin",
      mode: "percent",
      amount: 0.1,
    }),
    targetMetric: "cacPaybackPeriods",
  });

  const ranked = rankScenarioEvaluations({
    scenarios: [smallerGain, largerGain],
    targetMetric: "cacPaybackPeriods",
  });

  assert.equal(ranked[0]?.scenario.amount, 0.1);
  assert.equal(ranked[0]?.score.betterDirection, "lower");
  assert.ok((ranked[0]?.score.normalizedScore ?? 0) > (ranked[1]?.score.normalizedScore ?? 0));
});

test("analysis report builds deterministic sweeps and ranks applicable opportunities", () => {
  const evaluation = evaluateKpis(directSubscriptionPayload);
  const report = buildAnalysisReport({
    evaluation,
    targetMetric: "projectedProfitNextYear",
  });

  assert.equal(report.version, "analysis-v1");
  assert.deepEqual(getApplicableAnalysisLevers(directSubscriptionPayload), [
    "sales_velocity",
    "cac",
    "churn",
    "gross_margin",
    "price",
  ]);
  assert.equal(report.sweeps.length, 5);
  assert.equal(report.generatedScenarios.length, 15);
  assert.ok(report.bestOpportunity != null);
  assert.equal(report.bestOpportunity?.rank, 1);
  assert.equal(report.rankedOpportunities[0]?.scenarioId, report.bestOpportunity?.scenarioId);
});

test("analysis export returns the stable canonical JSON shape", () => {
  const report = buildAnalysisReport({
    evaluation: evaluateKpis(directSubscriptionPayload),
    targetMetric: "projectedProfitNextYear",
  });

  const exported = buildAnalysisExport({
    report,
    exportSource: "ui",
    exportedAt: "2026-03-07T12:00:00.000Z",
  });

  assert.equal(exported.version, "analysis-export-v1");
  assert.equal(exported.exportMetadata.exportSource, "ui");
  assert.equal(exported.exportMetadata.exportedAt, "2026-03-07T12:00:00.000Z");
  assert.equal(exported.exportMetadata.schemaVersion, "analysis-export-v1");
  assert.deepEqual(exported.baseline, report.baseline);
  assert.deepEqual(exported.report, report);
});

test("analysis export builds flat scenario rows with ranking and metric deltas", () => {
  const report = buildAnalysisReport({
    evaluation: evaluateKpis(directSubscriptionPayload),
    targetMetric: "projectedProfitNextYear",
  });

  const rows = buildAnalysisScenarioRows(report);
  const topRow = rows.find(
    (row) => row.scenarioId === report.bestOpportunity?.scenarioId,
  );

  assert.equal(rows.length, report.generatedScenarios.length);
  assert.ok(topRow != null);
  assert.equal(topRow?.baselineOfferId, "subscription-analysis");
  assert.equal(topRow?.baselineOfferType, "software_subscription");
  assert.equal(topRow?.targetMetric, "projectedProfitNextYear");
  assert.equal(topRow?.rank, 1);
  assert.equal(topRow?.confidence, report.bestOpportunity?.confidence ?? null);
  assert.equal(
    topRow?.baseline_projectedProfitNextYear,
    report.baseline.results.projectedProfitNextYear,
  );
  assert.equal(
    topRow?.scenario_projectedProfitNextYear,
    report.bestOpportunity?.score.scenario ?? null,
  );
  assert.equal(
    topRow?.delta_projectedProfitNextYear_absolute,
    report.bestOpportunity?.score.absoluteDelta ?? null,
  );
  assert.equal(
    topRow?.delta_projectedProfitNextYear_percent,
    report.bestOpportunity?.score.percentDelta ?? null,
  );
  assert.equal(typeof topRow?.warnings, "string");
  assert.equal(typeof topRow?.assumptionsApplied, "string");
});
