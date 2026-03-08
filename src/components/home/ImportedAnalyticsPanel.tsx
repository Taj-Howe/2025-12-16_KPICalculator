"use client";

import { useMemo, useState } from "react";
import LineChart from "@/components/LineChart";
import { StatCard, SelectField } from "./form-primitives";
import {
  buildImportedOfferAnalytics,
  deriveRefundRate,
  deriveSnapshotProfit,
  deriveSnapshotRevenue,
  type ImportedAnalyticsView,
} from "./imported-analytics";
import {
  formatMoney,
  formatPercent,
  formatRatio,
} from "./formatters";
import type { NormalizedOfferPeriodSnapshot } from "@/features/integrations/types";

type ImportedAnalyticsPanelProps = {
  snapshots: NormalizedOfferPeriodSnapshot[];
  isSignedIn: boolean;
  snapshotsError?: string | null;
};

const viewOptions: Array<{
  id: ImportedAnalyticsView;
  label: string;
  description: string;
}> = [
  {
    id: "revenue",
    label: "Revenue",
    description: "See whether imported receipts are compounding or flattening.",
  },
  {
    id: "profit",
    label: "Profit",
    description: "Track whether delivery and acquisition drag are compressing quality.",
  },
  {
    id: "retention",
    label: "Churn / Retention",
    description: "Spot when customer leakage starts to cap growth before it compounds.",
  },
  {
    id: "payback",
    label: "Payback",
    description: "Watch acquisition efficiency and cash recovery pressure over time.",
  },
  {
    id: "margin",
    label: "Margin Drift",
    description: "See if gross margin is slipping as refunds or delivery costs rise.",
  },
  {
    id: "upside",
    label: "Scenario Upside",
    description: "Surface the next operating lever with the highest projected upside.",
  },
];

const formatPeriods = (value: number | null) =>
  value == null ? "—" : `${value.toFixed(2)} periods`;

const bestMoveLabel = (label: string | null) => label ?? "No ranked move";

const ImportedAnalyticsPanel = ({
  snapshots,
  isSignedIn,
  snapshotsError,
}: ImportedAnalyticsPanelProps) => {
  const analyticsByOffer = useMemo(
    () => buildImportedOfferAnalytics(snapshots),
    [snapshots],
  );

  const [selectedOfferKey, setSelectedOfferKey] = useState<string>("");
  const [activeView, setActiveView] = useState<ImportedAnalyticsView>("revenue");

  const selectedOffer =
    analyticsByOffer.find((offer) => offer.offerKey === selectedOfferKey) ??
    analyticsByOffer[0] ??
    null;

  if (!isSignedIn) {
    return null;
  }

  return (
    <section className="panel-shell rounded-[28px] p-5 text-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/34">
            Imported Analytics
          </p>
          <h3 className="mt-2 text-xl font-semibold">Payments and accounting signals</h3>
          <p className="mt-1 max-w-2xl text-sm text-white/58">
            Decision-first views from imported offer snapshots. Each view is tied to a
            real operating choice: grow faster, recover CAC faster, retain better, or
            protect margin.
          </p>
        </div>
        {selectedOffer && analyticsByOffer.length > 1 ? (
          <div className="w-full max-w-xs">
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/38">
              Imported offer
            </p>
            <SelectField
              value={selectedOffer.offerKey}
              onChange={(event) => setSelectedOfferKey(event.target.value)}
            >
              {analyticsByOffer.map((offer) => (
                <option key={offer.offerKey} value={offer.offerKey}>
                  {offer.offerName}
                </option>
              ))}
            </SelectField>
          </div>
        ) : null}
      </div>

      {snapshotsError ? (
        <div className="panel-subtle mt-4 rounded-[20px] p-4 text-sm text-white/64">
          {snapshotsError}
        </div>
      ) : null}

      {!selectedOffer ? (
        <div className="panel-subtle mt-4 rounded-[20px] p-5 text-sm text-white/58">
          No imported snapshots yet. Connect Stripe and run a sync to unlock imported
          revenue, margin, retention, and upside analytics here.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              eyebrow="Imported revenue"
              value={formatMoney(deriveSnapshotRevenue(selectedOffer.latestSnapshot))}
              caption="Latest imported period"
            />
            <StatCard
              eyebrow="Imported profit"
              value={formatMoney(deriveSnapshotProfit(selectedOffer.latestSnapshot))}
              caption="Gross profit approximation"
            />
            <StatCard
              eyebrow="CAC payback"
              value={formatPeriods(
                selectedOffer.latestEvaluation?.evaluation?.results.cacPaybackPeriods ?? null,
              )}
              caption="Latest mapped calculator output"
            />
            <StatCard
              eyebrow="Best move"
              value={bestMoveLabel(
                selectedOffer.latestAnalysisReport?.bestOpportunity?.label ?? null,
              )}
              caption="Current highest-ROI lever"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {viewOptions.map((option) => {
              const active = option.id === activeView;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveView(option.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    active
                      ? "border-white bg-white text-black"
                      : "border-white/12 bg-white/[0.03] text-white/72 hover:border-white/22 hover:bg-white/[0.06]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <AnalyticsBody offer={selectedOffer} view={activeView} />
          </div>
        </>
      )}
    </section>
  );
};

const AnalyticsBody = ({
  offer,
  view,
}: {
  offer: ReturnType<typeof buildImportedOfferAnalytics>[number];
  view: ImportedAnalyticsView;
}) => {
  const evaluations = offer.evaluations;
  const latestAnalysis = offer.latestAnalysisReport;

  const renderLineView = ({
    title,
    description,
    primaryLabel,
    primaryValues,
    primaryFormatter,
    secondaryLabel,
    secondaryValues,
    secondaryFormatter,
    latestPrimary,
    latestSecondary,
    yLabel,
  }: {
    title: string;
    description: string;
    primaryLabel: string;
    primaryValues: Array<number | null>;
    primaryFormatter: (value: number | null) => string;
    secondaryLabel?: string;
    secondaryValues?: Array<number | null>;
    secondaryFormatter?: (value: number | null) => string;
    latestPrimary: number | null;
    latestSecondary?: number | null;
    yLabel: string;
  }) => {
    const series = [
      {
        name: primaryLabel,
        values: primaryValues,
        formatValue: (value: number) => primaryFormatter(value),
      },
    ] as Array<{
      name: string;
      values: Array<number | null>;
      color?: string;
      formatValue?: (value: number) => string;
    }>;
    if (secondaryLabel && secondaryValues) {
      series.push({
        name: secondaryLabel,
        values: secondaryValues,
        color: "rgba(255,255,255,0.38)",
        formatValue: (value: number) => secondaryFormatter?.(value) ?? String(value),
      });
    }

    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
        <div className="panel-subtle rounded-[22px] p-4">
          <LineChart
            labels={offer.labels}
            series={series}
            formatValue={(value) => primaryFormatter(value)}
            yLabel={yLabel}
            width={680}
            height={260}
          />
        </div>
        <div className="space-y-4">
          <div className="panel-subtle rounded-[22px] p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/36">
              {title}
            </p>
            <p className="mt-2 text-sm text-white/62">{description}</p>
          </div>
          <div className="panel-subtle rounded-[22px] p-4">
            <MetricRow label={primaryLabel} value={primaryFormatter(latestPrimary)} />
            {secondaryLabel && secondaryFormatter ? (
              <div className="mt-3">
                <MetricRow
                  label={secondaryLabel}
                  value={secondaryFormatter(latestSecondary ?? null)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  if (view === "revenue") {
    return renderLineView({
      title: "Revenue trend",
      description:
        "Use this to see whether imported receipts are truly compounding or whether the growth curve is flattening.",
      primaryLabel: "Revenue",
      primaryValues: offer.snapshots.map(deriveSnapshotRevenue),
      primaryFormatter: formatMoney,
      secondaryLabel: "Refunds",
      secondaryValues: offer.snapshots.map((snapshot) => snapshot.revenue.refunds),
      secondaryFormatter: formatMoney,
      latestPrimary: deriveSnapshotRevenue(offer.latestSnapshot),
      latestSecondary: offer.latestSnapshot.revenue.refunds,
      yLabel: "Revenue",
    });
  }

  if (view === "profit") {
    return renderLineView({
      title: "Profit trend",
      description:
        "Use this to see whether imported gross profit is keeping pace with receipts or being compressed by delivery and acquisition drag.",
      primaryLabel: "Gross profit",
      primaryValues: offer.snapshots.map(deriveSnapshotProfit),
      primaryFormatter: formatMoney,
      secondaryLabel: "Revenue",
      secondaryValues: offer.snapshots.map(deriveSnapshotRevenue),
      secondaryFormatter: formatMoney,
      latestPrimary: deriveSnapshotProfit(offer.latestSnapshot),
      latestSecondary: deriveSnapshotRevenue(offer.latestSnapshot),
      yLabel: "Profit",
    });
  }

  if (view === "retention") {
    return renderLineView({
      title: "Churn and retention movement",
      description:
        "Use this to see when customer leakage starts to cap growth so retention work can happen before acquisition gets wasted.",
      primaryLabel: "Retention",
      primaryValues: evaluations.map(
        (entry) => entry.evaluation?.results.retentionRate ?? null,
      ),
      primaryFormatter: formatPercent,
      secondaryLabel: "Churn",
      secondaryValues: evaluations.map(
        (entry) => entry.evaluation?.results.churnRate ?? null,
      ),
      secondaryFormatter: formatPercent,
      latestPrimary: offer.latestEvaluation?.evaluation?.results.retentionRate ?? null,
      latestSecondary: offer.latestEvaluation?.evaluation?.results.churnRate ?? null,
      yLabel: "Rate",
    });
  }

  if (view === "payback") {
    return renderLineView({
      title: "Payback movement",
      description:
        "Use this to see whether acquisition is getting easier to finance or whether the business is becoming more cash constrained.",
      primaryLabel: "CAC payback",
      primaryValues: evaluations.map(
        (entry) => entry.evaluation?.results.cacPaybackPeriods ?? null,
      ),
      primaryFormatter: formatPeriods,
      secondaryLabel: "LTGP:CAC",
      secondaryValues: evaluations.map(
        (entry) => entry.evaluation?.results.ltgpToCacRatio ?? null,
      ),
      secondaryFormatter: formatRatio,
      latestPrimary: offer.latestEvaluation?.evaluation?.results.cacPaybackPeriods ?? null,
      latestSecondary: offer.latestEvaluation?.evaluation?.results.ltgpToCacRatio ?? null,
      yLabel: "Efficiency",
    });
  }

  if (view === "margin") {
    return renderLineView({
      title: "Margin drift",
      description:
        "Use this to see if gross margin is eroding because refunds or delivery costs are rising faster than receipts.",
      primaryLabel: "Gross margin",
      primaryValues: offer.snapshots.map(
        (snapshot) => snapshot.delivery.observableGrossMargin,
      ),
      primaryFormatter: formatPercent,
      secondaryLabel: "Refund rate",
      secondaryValues: offer.snapshots.map(deriveRefundRate),
      secondaryFormatter: formatPercent,
      latestPrimary: offer.latestSnapshot.delivery.observableGrossMargin,
      latestSecondary: deriveRefundRate(offer.latestSnapshot),
      yLabel: "Margin",
    });
  }

  const topScenarios = latestAnalysis?.rankedOpportunities.slice(0, 3) ?? [];

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="panel-subtle rounded-[22px] p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/36">
          Scenario upside comparison
        </p>
        <p className="mt-2 text-sm text-white/62">
          Use this to decide which single lever should get the next operating focus
          based on the imported baseline and the deterministic scenario engine.
        </p>
        {latestAnalysis?.bestOpportunity ? (
          <div className="mt-4 rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/38">
              Best move
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {latestAnalysis.bestOpportunity.label}
            </p>
            <p className="mt-2 text-sm text-white/62">
              {latestAnalysis.bestOpportunity.summary}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricRow
                label="Projected profit delta"
                value={formatMoney(
                  latestAnalysis.bestOpportunity.score.absoluteDelta,
                )}
              />
              <MetricRow
                label="Confidence"
                value={latestAnalysis.bestOpportunity.confidence}
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-white/58">
            Not enough mapped imported data yet to rank upside scenarios.
          </div>
        )}
      </div>

      <div className="space-y-3">
        {topScenarios.map((opportunity) => (
          <div
            key={opportunity.scenarioId}
            className="panel-subtle rounded-[20px] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/36">
                  Rank {opportunity.rank}
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {opportunity.label}
                </p>
              </div>
              <div className="text-right text-sm text-white/72">
                {formatMoney(opportunity.score.absoluteDelta)}
              </div>
            </div>
            <p className="mt-2 text-sm text-white/60">{opportunity.summary}</p>
          </div>
        ))}
      </div>
    </div>
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
    <span className="text-white/58">{label}</span>
    <span className="font-medium text-white">{value}</span>
  </div>
);

export default ImportedAnalyticsPanel;
