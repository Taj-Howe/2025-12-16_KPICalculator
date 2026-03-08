import type { KpiEvaluation } from "./types";

export type HealthStatus =
  | "healthy"
  | "needs_work"
  | "at_risk"
  | "insufficient_data";

export type HealthSignalMetric =
  | "ltgpToCacRatio"
  | "cacPaybackPeriods"
  | "churnRate"
  | "grossMarginProxy";

export type HealthSignal = {
  metric: HealthSignalMetric;
  label: string;
  value: number | null;
  normalizedScore: number | null;
  weight: number;
  contribution: number | null;
  status: "strong" | "acceptable" | "weak" | "missing";
  explanation: string;
};

export type HealthAssessment = {
  version: "health-v1";
  status: HealthStatus;
  score: number | null;
  weightedSignalCoverage: number;
  headline: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  signals: HealthSignal[];
  thresholdVersion: "software-health-v1";
};

type SignalComputation = {
  normalizedScore: number | null;
  status: HealthSignal["status"];
  explanation: string;
};

const weights: Record<HealthSignalMetric, number> = {
  ltgpToCacRatio: 0.5,
  cacPaybackPeriods: 0.25,
  churnRate: 0.15,
  grossMarginProxy: 0.1,
};

const grossMarginProxy = (evaluation: KpiEvaluation) => {
  const { ltv, ltgpPerCustomer } = evaluation.results;
  if (ltv == null || ltgpPerCustomer == null || ltv <= 0) {
    return null;
  }
  return ltgpPerCustomer / ltv;
};

const scoreHigherBetter = (
  value: number | null,
  thresholds: [number, number, number],
  label: string,
): SignalComputation => {
  if (value == null) {
    return {
      normalizedScore: null,
      status: "missing",
      explanation: `${label} is missing.`,
    };
  }

  if (value >= thresholds[0]) {
    return {
      normalizedScore: 1,
      status: "strong",
      explanation: `${label} is strong.`,
    };
  }
  if (value >= thresholds[1]) {
    return {
      normalizedScore: 0.72,
      status: "acceptable",
      explanation: `${label} is acceptable but not elite.`,
    };
  }
  if (value >= thresholds[2]) {
    return {
      normalizedScore: 0.38,
      status: "weak",
      explanation: `${label} is weak and limits growth quality.`,
    };
  }
  return {
    normalizedScore: 0,
    status: "weak",
    explanation: `${label} is at risk and needs attention.`,
  };
};

const scoreLowerBetter = (
  value: number | null,
  thresholds: [number, number, number],
  label: string,
): SignalComputation => {
  if (value == null) {
    return {
      normalizedScore: null,
      status: "missing",
      explanation: `${label} is missing.`,
    };
  }

  if (value <= thresholds[0]) {
    return {
      normalizedScore: 1,
      status: "strong",
      explanation: `${label} is strong.`,
    };
  }
  if (value <= thresholds[1]) {
    return {
      normalizedScore: 0.72,
      status: "acceptable",
      explanation: `${label} is acceptable.`,
    };
  }
  if (value <= thresholds[2]) {
    return {
      normalizedScore: 0.38,
      status: "weak",
      explanation: `${label} is weak and may constrain growth.`,
    };
  }
  return {
    normalizedScore: 0,
    status: "weak",
    explanation: `${label} is at risk and likely too slow for healthy scaling.`,
  };
};

const buildSignals = (evaluation: KpiEvaluation): HealthSignal[] => {
  const signals: HealthSignal[] = [];

  const ltgpToCac = scoreHigherBetter(
    evaluation.results.ltgpToCacRatio,
    [5, 3, 2],
    "LTGP:CAC",
  );
  signals.push({
    metric: "ltgpToCacRatio",
    label: "LTGP:CAC",
    value: evaluation.results.ltgpToCacRatio,
    normalizedScore: ltgpToCac.normalizedScore,
    weight: weights.ltgpToCacRatio,
    contribution:
      ltgpToCac.normalizedScore == null
        ? null
        : ltgpToCac.normalizedScore * weights.ltgpToCacRatio,
    status: ltgpToCac.status,
    explanation: ltgpToCac.explanation,
  });

  const payback = scoreLowerBetter(
    evaluation.results.cacPaybackPeriods,
    [3, 6, 12],
    "CAC payback",
  );
  signals.push({
    metric: "cacPaybackPeriods",
    label: "CAC payback",
    value: evaluation.results.cacPaybackPeriods,
    normalizedScore: payback.normalizedScore,
    weight: weights.cacPaybackPeriods,
    contribution:
      payback.normalizedScore == null
        ? null
        : payback.normalizedScore * weights.cacPaybackPeriods,
    status: payback.status,
    explanation: payback.explanation,
  });

  const churn = scoreLowerBetter(
    evaluation.results.churnRate,
    [0.03, 0.07, 0.12],
    "Churn",
  );
  signals.push({
    metric: "churnRate",
    label: "Churn",
    value: evaluation.results.churnRate,
    normalizedScore: churn.normalizedScore,
    weight: weights.churnRate,
    contribution:
      churn.normalizedScore == null
        ? null
        : churn.normalizedScore * weights.churnRate,
    status: churn.status,
    explanation: churn.explanation,
  });

  const marginValue = grossMarginProxy(evaluation);
  const margin = scoreHigherBetter(
    marginValue,
    [0.8, 0.65, 0.45],
    "Gross margin quality",
  );
  signals.push({
    metric: "grossMarginProxy",
    label: "Gross margin quality",
    value: marginValue,
    normalizedScore: margin.normalizedScore,
    weight: weights.grossMarginProxy,
    contribution:
      margin.normalizedScore == null
        ? null
        : margin.normalizedScore * weights.grossMarginProxy,
    status: margin.status,
    explanation: margin.explanation,
  });

  return signals;
};

const buildHeadline = (status: HealthStatus) => {
  if (status === "healthy") {
    return "Offer looks healthy";
  }
  if (status === "needs_work") {
    return "Offer has workable economics";
  }
  if (status === "at_risk") {
    return "Offer is at risk";
  }
  return "Offer health is incomplete";
};

const buildSummary = (status: HealthStatus) => {
  if (status === "healthy") {
    return "The current offer clears the main growth-quality checks, with LTGP:CAC leading the score.";
  }
  if (status === "needs_work") {
    return "The offer can work, but at least one core driver is soft enough to cap healthy scaling.";
  }
  if (status === "at_risk") {
    return "The current economics are too weak to trust aggressive growth without fixing the core driver first.";
  }
  return "There is not enough reliable signal yet to classify this offer confidently.";
};

export const buildHealthAssessment = (
  evaluation: KpiEvaluation,
): HealthAssessment => {
  const signals = buildSignals(evaluation);
  const weightedSignals = signals.filter(
    (signal): signal is HealthSignal & { normalizedScore: number; contribution: number } =>
      signal.normalizedScore != null && signal.contribution != null,
  );
  const totalWeight = weightedSignals.reduce((sum, signal) => sum + signal.weight, 0);
  const weightedScore =
    totalWeight > 0
      ? weightedSignals.reduce((sum, signal) => sum + signal.contribution, 0) / totalWeight
      : null;
  const score = weightedScore == null ? null : Math.round(weightedScore * 100);
  const weightedSignalCoverage = totalWeight;
  const ratio = evaluation.results.ltgpToCacRatio;
  const payback = evaluation.results.cacPaybackPeriods;

  let status: HealthStatus = "insufficient_data";
  if (
    ratio == null &&
    weightedSignals.length < 2
  ) {
    status = "insufficient_data";
  } else if (
    score != null &&
    (score < 45 || (ratio != null && ratio < 2) || (payback != null && payback > 12))
  ) {
    status = "at_risk";
  } else if (
    score != null &&
    score >= 75 &&
    (ratio == null || ratio >= 3) &&
    (payback == null || payback <= 12)
  ) {
    status = "healthy";
  } else {
    status = "needs_work";
  }

  const strengths = signals
    .filter((signal) => signal.status === "strong")
    .map((signal) => signal.explanation)
    .slice(0, 3);

  const weaknesses = signals
    .filter((signal) => signal.status === "weak" || signal.status === "missing")
    .map((signal) => signal.explanation)
    .slice(0, 3);

  return {
    version: "health-v1",
    status,
    score,
    weightedSignalCoverage,
    headline: buildHeadline(status),
    summary: buildSummary(status),
    strengths,
    weaknesses,
    signals,
    thresholdVersion: "software-health-v1",
  };
};
