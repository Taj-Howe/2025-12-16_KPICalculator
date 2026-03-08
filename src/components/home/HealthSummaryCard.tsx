"use client";

import { useMemo } from "react";
import { buildFallbackAiOpportunitySummary } from "@/features/kpi/analysis-ai";
import { buildAnalysisReport } from "@/features/kpi/analysis";
import { buildHealthAssessment } from "@/features/kpi/health";
import type { KpiEvaluation } from "@/features/kpi/types";

const statusStyles: Record<
  ReturnType<typeof buildHealthAssessment>["status"],
  string
> = {
  healthy: "border-emerald-300/20 bg-emerald-400/10 text-emerald-50",
  needs_work: "border-amber-300/20 bg-amber-400/10 text-amber-50",
  at_risk: "border-rose-300/20 bg-rose-400/10 text-rose-50",
  insufficient_data: "border-white/10 bg-white/[0.03] text-white",
};

const humanizeStatus = (
  status: ReturnType<typeof buildHealthAssessment>["status"],
) => {
  if (status === "needs_work") {
    return "Needs work";
  }
  if (status === "at_risk") {
    return "At risk";
  }
  if (status === "insufficient_data") {
    return "Incomplete";
  }
  return "Healthy";
};

const HealthSummaryCard = ({
  evaluation,
}: {
  evaluation: KpiEvaluation;
}) => {
  const health = useMemo(() => buildHealthAssessment(evaluation), [evaluation]);
  const recommendation = useMemo(() => {
    const report = buildAnalysisReport({ evaluation });
    return buildFallbackAiOpportunitySummary(
      {
        baseline: report.baseline,
        targetMetric: report.targetMetric,
        bestOpportunity: report.bestOpportunity,
        topOpportunities: report.rankedOpportunities.slice(0, 3),
        generatedScenarios: report.generatedScenarios,
      },
    );
  }, [evaluation]);

  return (
    <section
      className={`rounded-[24px] border p-5 ${statusStyles[health.status]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] opacity-65">
            Offer health
          </p>
          <h3 className="mt-2 text-xl font-semibold">{health.headline}</h3>
          <p className="mt-2 max-w-2xl text-sm opacity-80">{health.summary}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.22em] opacity-65">
            Status
          </p>
          <p className="mt-2 text-lg font-semibold">{humanizeStatus(health.status)}</p>
          <p className="mt-1 text-sm opacity-80">
            Score: {health.score == null ? "—" : `${health.score}/100`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <div className="rounded-[18px] border border-white/10 bg-black/15 p-4">
            <p className="text-xs uppercase tracking-[0.18em] opacity-60">
              Strengths
            </p>
            <ul className="mt-3 space-y-2 text-sm opacity-90">
              {health.strengths.length > 0 ? (
                health.strengths.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>No strong signals yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-[18px] border border-white/10 bg-black/15 p-4">
            <p className="text-xs uppercase tracking-[0.18em] opacity-60">
              Weak points
            </p>
            <ul className="mt-3 space-y-2 text-sm opacity-90">
              {health.weaknesses.length > 0 ? (
                health.weaknesses.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>No major weak signals detected.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-black/15 p-4">
          <p className="text-xs uppercase tracking-[0.18em] opacity-60">
            Best next move
          </p>
          <p className="mt-3 text-base font-semibold">{recommendation.headline}</p>
          <p className="mt-2 text-sm opacity-85">{recommendation.recommendation}</p>

          {recommendation.expectedImpact ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricRow
                label="Target metric"
                value={recommendation.expectedImpact.targetMetric ?? "—"}
              />
              <MetricRow
                label="Absolute delta"
                value={
                  recommendation.expectedImpact.absoluteDelta == null
                    ? "—"
                    : recommendation.expectedImpact.absoluteDelta.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })
                }
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

const MetricRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex items-center justify-between gap-4 text-sm">
    <span className="opacity-70">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default HealthSummaryCard;
