"use client";

import { useMemo, useState } from "react";
import LineChart from "@/components/LineChart";
import Sparkline from "@/components/Sparkline";
import type { ReportsPanelProps } from "./types";
import ImportedAnalyticsPanel from "./ImportedAnalyticsPanel";
import {
  formatLabel,
  formatMoney,
  formatPercent,
  formatRatio,
} from "./formatters";
import { SelectField, StatCard, pillClassName } from "./form-primitives";

const ReportsDashboard = ({
  isSignedIn,
  reports,
  selectedReport,
  onSelectReport,
  onRefresh,
  series,
  importedSnapshots = [],
  snapshotsError,
  reportsError,
  seriesError,
  signInCta,
  onSeedSampleYear,
  isSeeding,
  seedStatus,
  onDeleteReport,
}: ReportsPanelProps) => {
  const hasReports = reports.length > 0;
  const selected = selectedReport ?? (hasReports ? reports[0] ?? null : null);
  const result = selected?.resultJson;
  const warnings = selected?.warningsJson ?? [];
  const latestTrendIndex =
    series && series.labels.length > 0 ? series.labels.length - 1 : null;
  const metricOptions = useMemo(
    () => [
      { key: "ltgpToCacRatio", label: "LTGP:CAC", format: "ratio" },
      { key: "cac", label: "CAC", format: "money" },
      { key: "cacPaybackPeriods", label: "Payback", format: "periods" },
      { key: "projectedProfitNextYear", label: "Projected Profit", format: "money" },
      { key: "hypotheticalMaxProfitPerYear", label: "Max Profit", format: "money" },
    ],
    [],
  );
  const [metricKey, setMetricKey] = useState(metricOptions[0].key);
  const [compareKey, setCompareKey] = useState(metricOptions[1].key);

  const selectedMetric = metricOptions.find((metric) => metric.key === metricKey);
  const compareMetric = metricOptions.find((metric) => metric.key === compareKey);
  const selectedSeries =
    selectedMetric && series
      ? (series[selectedMetric.key as keyof typeof series] as (number | null)[])
      : [];
  const compareSeries =
    compareMetric && series
      ? (series[compareMetric.key as keyof typeof series] as (number | null)[])
      : [];

  const formatValue = (value: number | null, format: string) => {
    if (value == null) return "—";
    switch (format) {
      case "money":
        return formatMoney(value);
      case "percent":
        return formatPercent(value);
      case "ratio":
        return formatRatio(value);
      case "periods":
        return `${value.toFixed(2)} periods`;
      default:
        return value.toFixed(2);
    }
  };

  const describeReport = (report: (typeof reports)[number]) =>
    report.offerName?.trim() || report.title?.trim() || "Untitled";
  const describeType = (report: (typeof reports)[number]) =>
    report.offerType ?? report.businessModel;

  return (
    <section className="space-y-6 text-white">
      <section className="panel-shell rounded-[28px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/34">
              Reports Dashboard
            </p>
            <h2 className="mt-2 text-xl font-semibold">Saved scenarios and trends</h2>
            <p className="mt-1 text-sm text-white/58">
              Review saved snapshots, compare current economics, and inspect trend
              movement across periods.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onRefresh()}
              className={pillClassName}
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={onSeedSampleYear}
              disabled={!isSignedIn || isSeeding}
              className={`${pillClassName} disabled:opacity-50 disabled:hover:border-white/16 disabled:hover:bg-white/[0.018] disabled:hover:text-white`}
            >
              {isSeeding ? "Loading sample year..." : "Load sample year"}
            </button>
          </div>
        </div>

        {seedStatus && <p className="mt-3 text-sm text-white/56">{seedStatus}</p>}
        {reportsError && <p className="mt-3 text-sm text-white/56">{reportsError}</p>}
        {seriesError && <p className="mt-2 text-sm text-white/56">{seriesError}</p>}

        {!isSignedIn && (
          <div className="panel-subtle mt-4 rounded-[22px] p-5">
            <p className="text-sm text-white/64">
              Sign in to save reports and build a real trend history for your offers.
            </p>
            {signInCta && <div className="mt-4">{signInCta}</div>}
          </div>
        )}

        {isSignedIn && hasReports && (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              eyebrow="Core ratio"
              value={formatRatio(result?.ltgpToCacRatio ?? null)}
              caption="Latest LTGP:CAC"
            />
            <StatCard
              eyebrow="CAC"
              value={formatMoney(result?.cac ?? null)}
              caption="Latest acquisition cost"
            />
            <StatCard
              eyebrow="Projected profit"
              value={formatMoney(result?.projectedProfitNextYear ?? null)}
              caption="Next-year projection"
            />
            <StatCard
              eyebrow="Max revenue"
              value={formatMoney(result?.hypotheticalMaxRevenuePerYear ?? null)}
              caption="Steady-state ceiling"
            />
          </div>
        )}

        {isSignedIn && !hasReports && (
          <div className="panel-subtle mt-4 rounded-[22px] p-5 text-sm text-white/58">
            No reports yet. Save a scenario from the offer workspace to start building history.
          </div>
        )}
      </section>

      {isSignedIn && hasReports && (
        <section className="grid gap-6 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
          <div className="panel-shell rounded-[26px] p-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/34">
              Saved snapshots
            </p>
            <div className="mt-4 space-y-2">
              {reports.map((report) => {
                const createdAt =
                  report.createdAt == null
                    ? "—"
                    : new Date(report.createdAt).toLocaleDateString("en-US");
                const isSelected = selected?.id === report.id;
                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => onSelectReport(report.id)}
                    className={`w-full rounded-[18px] border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-white/20 bg-white/[0.04]"
                        : "border-white/8 bg-white/[0.015] hover:border-white/14 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-white">{describeReport(report)}</span>
                      <span className="text-xs text-white/42">{createdAt}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/54">
                      {formatLabel(report.periodLabel ?? "Unlabeled")} · {report.period} ·{" "}
                      {describeType(report)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="panel-shell rounded-[26px] p-5">
            {selected ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/34">
                      Selected snapshot
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">{describeReport(selected)}</h3>
                    <p className="mt-1 text-sm text-white/56">
                      {formatLabel(selected.periodLabel ?? "Unlabeled")} · {selected.period} ·{" "}
                      {describeType(selected)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteReport(selected.id)}
                    className={pillClassName}
                  >
                    Delete report
                  </button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <MetricDetail label="LTGP:CAC" value={formatRatio(result?.ltgpToCacRatio ?? null)} />
                  <MetricDetail label="CAC payback" value={formatValue(result?.cacPaybackPeriods ?? null, "periods")} />
                  <MetricDetail label="CAC" value={formatMoney(result?.cac ?? null)} />
                  <MetricDetail label="ARPC" value={formatMoney(result?.arpc ?? null)} />
                  <MetricDetail label="Churn" value={formatPercent(result?.churnRate ?? null)} />
                  <MetricDetail label="Retention" value={formatPercent(result?.retentionRate ?? null)} />
                  <MetricDetail label="Projected profit" value={formatMoney(result?.projectedProfitNextYear ?? null)} />
                  <MetricDetail label="Max revenue" value={formatMoney(result?.hypotheticalMaxRevenuePerYear ?? null)} />
                </div>

                {warnings.length > 0 && (
                  <div className="panel-subtle mt-4 rounded-[18px] p-4 text-sm text-white/66">
                    <p className="font-semibold text-white">Warnings</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-white/56">Select a report to preview.</p>
            )}
          </div>
        </section>
      )}

      {series && series.labels.length > 0 && (
        <section className="panel-shell rounded-[28px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/34">
                Trends
              </p>
              <h3 className="mt-2 text-lg font-semibold">Performance movement</h3>
              <p className="mt-1 text-sm text-white/56">
                {series.period} snapshots · {series.labels.length} saved periods
              </p>
            </div>
            <div className="text-sm text-white/56">
              Latest: {latestTrendIndex != null ? series.labels[latestTrendIndex] : "—"}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {metricOptions.map((metric) => {
              const active = metric.key === metricKey;
              return (
                <button
                  key={metric.key}
                  type="button"
                  onClick={() => setMetricKey(metric.key)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    active
                      ? "border-white bg-white text-black"
                      : "border-white/12 bg-white/[0.03] text-white/72 hover:border-white/22 hover:bg-white/[0.06]"
                  }`}
                >
                  {metric.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[160px_1fr]">
            <div className="panel-subtle rounded-[20px] p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/36">
                Current trend
              </p>
              <div className="mt-3 space-y-3">
                <MetricDetail
                  label={selectedMetric?.label ?? "Metric"}
                  value={formatValue(
                    latestTrendIndex != null ? selectedSeries[latestTrendIndex] ?? null : null,
                    selectedMetric?.format ?? "ratio",
                  )}
                />
                <MetricDetail
                  label={compareMetric?.label ?? "Compare"}
                  value={formatValue(
                    latestTrendIndex != null ? compareSeries[latestTrendIndex] ?? null : null,
                    compareMetric?.format ?? "money",
                  )}
                />
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs text-white/46">Compare against</p>
                <SelectField
                  value={compareKey}
                  onChange={(event) => setCompareKey(event.target.value)}
                >
                  {metricOptions.map((metric) => (
                    <option key={metric.key} value={metric.key}>
                      {metric.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            <div className="space-y-3">
              <div className="panel-subtle rounded-[20px] p-4">
                <Sparkline values={selectedSeries} labels={series.labels} />
              </div>
              <div className="panel-subtle rounded-[20px] p-4">
                <LineChart
                  labels={series.labels}
                  series={[
                    { name: selectedMetric?.label ?? "Metric", values: selectedSeries },
                    { name: compareMetric?.label ?? "Compare", values: compareSeries },
                  ]}
                  formatValue={(value) =>
                    formatValue(value, selectedMetric?.format ?? "ratio")
                  }
                  yLabel="Trend"
                  width={560}
                  height={240}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <ImportedAnalyticsPanel
        snapshots={importedSnapshots}
        isSignedIn={isSignedIn}
        snapshotsError={snapshotsError}
      />
    </section>
  );
};

const MetricDetail = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex items-center justify-between gap-4 text-sm">
    <span className="text-white/62">{label}</span>
    <span className="font-medium text-white">{value}</span>
  </div>
);

export default ReportsDashboard;
