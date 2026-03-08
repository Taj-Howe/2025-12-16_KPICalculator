import type {
  AnalysisLever,
  AnalysisReport,
  AnalysisTargetMetric,
  AnalysisBaselineSnapshot,
  KpiMetricKey,
  RankedOpportunity,
  ScenarioEvaluation,
} from "./analysis";

export type AiOpportunitySummaryInput = {
  baseline: AnalysisBaselineSnapshot;
  targetMetric: KpiMetricKey;
  bestOpportunity: RankedOpportunity | null;
  topOpportunities: RankedOpportunity[];
  generatedScenarios: ScenarioEvaluation[];
};

export type AiOpportunitySummaryOutput = {
  version: "ai-opportunity-summary-v1";
  headline: string;
  recommendation: string;
  recommendedLever: AnalysisLever | null;
  recommendedScenarioId: string | null;
  whyItWon: string[];
  expectedImpact: {
    targetMetric: KpiMetricKey | null;
    baseline: number | null;
    scenario: number | null;
    absoluteDelta: number | null;
    percentDelta: number | null;
  } | null;
  caveats: string[];
  basedOnWarnings: string[];
};

export type AiOpportunityNarrative = {
  headline: string;
  recommendation: string;
  whyItWon: string[];
  caveats: string[];
};

export type AiOpportunitySummaryProvider = (
  input: AiOpportunitySummaryInput,
) => Promise<AiOpportunityNarrative | null>;

const DEFAULT_TOP_OPPORTUNITIES = 3;

const humanizeLever = (lever: AnalysisLever) => lever.replaceAll("_", " ");

const humanizeMetric = (metric: KpiMetricKey) =>
  metric
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (value) => value.toUpperCase());

const formatNumber = (value: number | null) => {
  if (value == null) {
    return "n/a";
  }
  return value.toLocaleString("en-US", {
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
  });
};

const formatPercent = (value: number | null) => {
  if (value == null) {
    return "n/a";
  }
  return `${(value * 100).toFixed(1)}%`;
};

const expectedImpactFromOpportunity = (
  opportunity: RankedOpportunity | null,
  targetMetric: KpiMetricKey,
) => {
  if (opportunity == null) {
    return null;
  }

  return {
    targetMetric,
    baseline: opportunity.score.baseline,
    scenario: opportunity.score.scenario,
    absoluteDelta: opportunity.score.absoluteDelta,
    percentDelta: opportunity.score.percentDelta,
  };
};

const buildFallbackNarrative = (
  input: AiOpportunitySummaryInput,
): AiOpportunityNarrative => {
  const best = input.bestOpportunity;

  if (best == null) {
    return {
      headline: "No validated improvement move available",
      recommendation:
        "The current analysis did not produce a valid ranked opportunity. Fix baseline completeness or unsupported assumptions before relying on an AI recommendation.",
      whyItWon: [
        "No valid scenario beat the baseline under the current deterministic rules.",
      ],
      caveats: [
        "Recommendation is blocked until at least one valid scenario ranks successfully.",
      ],
    };
  }

  const betterDirection = best.score.betterDirection;
  const metricLabel = humanizeMetric(input.targetMetric);
  const leverLabel = humanizeLever(best.lever);
  const absolute = formatNumber(best.score.absoluteDelta);
  const percent = formatPercent(best.score.percentDelta);

  return {
    headline: `Best move: improve ${leverLabel}`,
    recommendation: `Prioritize ${leverLabel}. It ranked first because it changes ${metricLabel} from ${formatNumber(
      best.score.baseline,
    )} to ${formatNumber(best.score.scenario)} (${absolute}, ${percent}).`,
    whyItWon: [
      `${leverLabel} ranked #1 out of ${input.topOpportunities.length} scored opportunities.`,
      `${metricLabel} is better when it moves ${betterDirection}, and this scenario produced the strongest normalized score.`,
      `The deterministic engine changed ${best.scenario.fieldPath} using the explicit scenario defined in ${best.scenario.id}.`,
    ],
    caveats:
      best.warnings.length > 0
        ? [
            `This recommendation carries ${best.warnings.length} warning${best.warnings.length === 1 ? "" : "s"}.`,
          ]
        : [],
  };
};

const mergeNarrative = ({
  fallback,
  providerNarrative,
}: {
  fallback: AiOpportunityNarrative;
  providerNarrative: AiOpportunityNarrative | null;
}): AiOpportunityNarrative => {
  if (providerNarrative == null) {
    return fallback;
  }

  return {
    headline:
      providerNarrative.headline.trim().length > 0
        ? providerNarrative.headline
        : fallback.headline,
    recommendation:
      providerNarrative.recommendation.trim().length > 0
        ? providerNarrative.recommendation
        : fallback.recommendation,
    whyItWon:
      providerNarrative.whyItWon.length > 0
        ? providerNarrative.whyItWon
        : fallback.whyItWon,
    caveats:
      providerNarrative.caveats.length > 0
        ? providerNarrative.caveats
        : fallback.caveats,
  };
};

export const createAiOpportunitySummaryInput = (
  report: AnalysisReport,
): AiOpportunitySummaryInput => {
  return {
    baseline: structuredClone(report.baseline),
    targetMetric: report.targetMetric,
    bestOpportunity:
      report.bestOpportunity == null ? null : structuredClone(report.bestOpportunity),
    topOpportunities: structuredClone(
      report.rankedOpportunities.slice(0, DEFAULT_TOP_OPPORTUNITIES),
    ),
    generatedScenarios: structuredClone(report.generatedScenarios),
  };
};

export const buildFallbackAiOpportunitySummary = (
  input: AiOpportunitySummaryInput,
): AiOpportunitySummaryOutput => {
  const narrative = buildFallbackNarrative(input);
  const best = input.bestOpportunity;

  return {
    version: "ai-opportunity-summary-v1",
    headline: narrative.headline,
    recommendation: narrative.recommendation,
    recommendedLever: best?.lever ?? null,
    recommendedScenarioId: best?.scenarioId ?? null,
    whyItWon: narrative.whyItWon,
    expectedImpact: expectedImpactFromOpportunity(best, input.targetMetric),
    caveats: narrative.caveats,
    basedOnWarnings: best?.warnings ?? [],
  };
};

export const generateAiOpportunitySummary = async ({
  report,
  provider,
}: {
  report: AnalysisReport;
  provider?: AiOpportunitySummaryProvider;
}): Promise<AiOpportunitySummaryOutput> => {
  const input = createAiOpportunitySummaryInput(report);
  const fallback = buildFallbackAiOpportunitySummary(input);

  if (provider == null) {
    return fallback;
  }

  try {
    const providerNarrative = await provider(input);
    const merged = mergeNarrative({
      fallback: {
        headline: fallback.headline,
        recommendation: fallback.recommendation,
        whyItWon: fallback.whyItWon,
        caveats: fallback.caveats,
      },
      providerNarrative,
    });

    return {
      ...fallback,
      headline: merged.headline,
      recommendation: merged.recommendation,
      whyItWon: merged.whyItWon,
      caveats: merged.caveats,
    };
  } catch {
    return fallback;
  }
};

export const isAiOpportunityProviderConfigured = (
  provider?: AiOpportunitySummaryProvider,
) => provider != null;

export const defaultAnalysisTargetMetric: AnalysisTargetMetric =
  "projectedProfitNextYear";
