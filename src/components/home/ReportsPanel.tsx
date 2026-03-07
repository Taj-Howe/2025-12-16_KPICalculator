"use client";

import type { ReportsPanelProps } from "./types";
import { useMemo, useState } from "react";
import {
  formatLabel,
  formatMoney,
  formatPercent,
  formatRatio,
} from "./formatters";
import Sparkline from "@/components/Sparkline";
import LineChart from "@/components/LineChart";

const ReportsPanel = ({
  isSignedIn,
  reports,
  selectedReport,
  onSelectReport,
  onRefresh,
  series,
  signInCta,
  onSeedSampleYear,
  isSeeding,
  seedStatus,
  onDeleteReport,
}: ReportsPanelProps) => {
  const shellClass = "panel-shell rounded-[26px] p-5";
  const subtleClass = "panel-subtle rounded-[20px] p-4";
  const pillClass = "pill-action rounded-full px-3 py-1";
  const hasReports = reports.length > 0;
  const selected =
    selectedReport ?? (hasReports ? reports[0] ?? null : null);
  const warnings = selected?.warningsJson ?? [];
  const result = selected?.resultJson;
  const latestTrendIndex =
    series && series.labels.length > 0 ? series.labels.length - 1 : null;
  const metricOptions = useMemo(
    () => [
      { key: "ltgpToCacRatio", label: "LTGP:CAC", format: "ratio" },
      { key: "cac", label: "CAC", format: "money" },
      { key: "cacPaybackPeriods", label: "CAC Payback", format: "periods" },
      { key: "arpc", label: "ARPC", format: "money" },
      { key: "churnRate", label: "Churn", format: "percent" },
      { key: "retentionRate", label: "Retention", format: "percent" },
      {
        key: "hypotheticalMaxProfitPerYear",
        label: "Hypothetical Max Profit / Year",
        format: "money",
      },
      {
        key: "projectedProfitNextYear",
        label: "Projected Profit / Next Year",
        format: "money",
      },
    ],
    [],
  );
  const [metricKey, setMetricKey] = useState(metricOptions[0].key);
  const [compareKey, setCompareKey] = useState(metricOptions[1].key);

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

  const selectedMetric = metricOptions.find((m) => m.key === metricKey);
  const compareMetric = metricOptions.find((m) => m.key === compareKey);
  const selectedSeries =
    selectedMetric && series
      ? (series[selectedMetric.key as keyof typeof series] as (number | null)[])
      : [];
  const compareSeries =
    compareMetric && series
      ? (series[compareMetric.key as keyof typeof series] as (number | null)[])
      : [];
  const describeReport = (report: (typeof reports)[number]) =>
    report.offerName?.trim() || report.title?.trim() || "Untitled";
  const describeType = (report: (typeof reports)[number]) =>
    report.offerType ?? report.businessModel;

  return (
    <section className={`${shellClass} text-white`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Reports</h2>
          <p className="text-sm text-white/58">
            Saved KPI snapshots and recent trends.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className={`${pillClass} text-sm`}
        >
          Refresh
        </button>
      </div>

      {!isSignedIn && (
        <div className={`${subtleClass} mt-4 text-sm`}>
          <p className="text-white/64">
            Sign in to save reports and see your personal history.
          </p>
          {signInCta && <div className="mt-3">{signInCta}</div>}
        </div>
      )}

      {isSignedIn && !hasReports && (
        <p className="mt-4 text-sm text-white/58">No reports yet.</p>
      )}

      {isSignedIn && hasReports && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ul className="space-y-2 text-sm">
            {reports.map((report) => {
              const createdAt =
                report.createdAt == null
                  ? "—"
                  : new Date(report.createdAt).toLocaleDateString();
              const label = formatLabel(report.periodLabel ?? "Unlabeled");
              const isSelected = selected?.id === report.id;
              return (
                <li key={report.id}>
                  <button
                    type="button"
                    onClick={() => onSelectReport(report.id)}
                    className={`w-full rounded-[18px] border px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? "border-white/20 bg-white/[0.04]"
                        : "border-white/8 bg-white/[0.015] hover:border-white/14 hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{describeReport(report)}</span>
                      <span className="text-xs text-white/46">{createdAt}</span>
                    </div>
                    <div className="text-xs text-white/56">
                      {label} · {report.period} · {describeType(report)}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className={`${subtleClass} text-sm`}>
            {selected ? (
              <>
                <div className="text-sm font-semibold">{describeReport(selected)}</div>
                <div className="text-xs text-white/56">
                  {formatLabel(selected.periodLabel ?? "Unlabeled")} ·{" "}
                  {selected.period} · {describeType(selected)}
                </div>
                <div className="mt-3 grid gap-2 text-xs text-white/68">
                  <div className="flex items-center justify-between">
                    <span>LTGP:CAC</span>
                    <span>{formatRatio(result?.ltgpToCacRatio ?? null)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>CAC</span>
                    <span>{formatMoney(result?.cac ?? null)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ARPC</span>
                    <span>{formatMoney(result?.arpc ?? null)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>LTV</span>
                    <span>{formatMoney(result?.ltv ?? null)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Churn</span>
                    <span>{formatPercent(result?.churnRate ?? null)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Retention</span>
                    <span>{formatPercent(result?.retentionRate ?? null)}</span>
                  </div>
                </div>

                {warnings.length > 0 && (
                  <div className="panel-subtle mt-3 rounded-[16px] p-3 text-xs text-white/68">
                    <p className="font-semibold">Warnings</p>
                    <ul className="mt-1 list-disc pl-4">
                      {warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onDeleteReport(selected.id)}
                    className={`${pillClass} text-xs`}
                  >
                    Delete report
                  </button>
                </div>
              </>
            ) : (
              <p className="text-white/56">Select a report to preview.</p>
            )}
          </div>
        </div>
      )}

      {series && series.labels.length > 0 && (
        <div className={`${subtleClass} mt-4 text-sm`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Trends</h3>
              <p className="text-xs text-white/56">
                {series.period} snapshots · {series.labels.length} points
              </p>
            </div>
            <div className="text-xs text-white/56">
              Latest:{" "}
              {latestTrendIndex != null
                ? series.labels[latestTrendIndex]
                : "—"}
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[140px_1fr]">
            <div className="panel-subtle rounded-[16px] p-3 text-xs">
              <div className="font-semibold">LTGP:CAC</div>
              <div className="text-white/68">
                {latestTrendIndex != null
                  ? formatRatio(series.ltgpToCacRatio[latestTrendIndex] ?? null)
                  : "—"}
              </div>
              <div className="mt-2 font-semibold">CAC</div>
              <div className="text-white/68">
                {latestTrendIndex != null
                  ? formatMoney(series.cac[latestTrendIndex] ?? null)
                  : "—"}
              </div>
            </div>
            <div className="panel-subtle rounded-[16px] p-3">
              <Sparkline values={series.ltgpToCacRatio} labels={series.labels} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/56">
            <label className="flex items-center gap-2">
              Metric
              <select
                value={metricKey}
                onChange={(e) => setMetricKey(e.target.value)}
                className="input-shell rounded-[14px] px-2 py-1 text-white"
              >
                {metricOptions.map((metric) => (
                  <option key={metric.key} value={metric.key}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2">
              Compare
              <select
                value={compareKey}
                onChange={(e) => setCompareKey(e.target.value)}
                className="input-shell rounded-[14px] px-2 py-1 text-white"
              >
                {metricOptions.map((metric) => (
                  <option key={metric.key} value={metric.key}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3">
            <LineChart
              labels={series.labels}
              series={[
                {
                  name: selectedMetric?.label ?? "Metric",
                  values: selectedSeries,
                },
                {
                  name: compareMetric?.label ?? "Compare",
                  values: compareSeries,
                },
              ]}
              formatValue={(value) =>
                formatValue(value, selectedMetric?.format ?? "ratio")
              }
              yLabel="Trends"
              width={520}
              height={220}
            />
          </div>
        </div>
      )}

      <div className={`${subtleClass} mt-4 text-xs`}>
        <p className="text-white/68">Sample data tools</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSeedSampleYear}
            disabled={!isSignedIn || isSeeding}
            className={`${pillClass} disabled:opacity-50 disabled:hover:border-white/16 disabled:hover:bg-white/[0.018] disabled:hover:text-white`}
          >
            Load sample year of reports (12 months)
          </button>
        </div>
        {seedStatus && <p className="mt-2 text-white/56">{seedStatus}</p>}
        {!isSignedIn && <p className="mt-1 text-white/46">Sign in required.</p>}
      </div>
    </section>
  );
};

export default ReportsPanel;
