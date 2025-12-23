"use client";

import type { ReportsPanelProps } from "./types";
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
}: ReportsPanelProps) => {
  const hasReports = reports.length > 0;
  const selected =
    selectedReport ?? (hasReports ? reports[0] ?? null : null);
  const warnings = selected?.warningsJson ?? [];
  const result = selected?.resultJson;
  const latestTrendIndex =
    series && series.labels.length > 0 ? series.labels.length - 1 : null;

  return (
    <section className="rounded border border-white/30 bg-black p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Reports</h2>
          <p className="text-sm text-white/70">
            Saved KPI snapshots and recent trends.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="rounded border border-white/60 px-3 py-1 text-sm text-white"
        >
          Refresh
        </button>
      </div>

      {!isSignedIn && (
        <div className="mt-4 rounded border border-white/30 p-4 text-sm">
          <p className="text-white/80">
            Sign in to save reports and see your personal history.
          </p>
          {signInCta && <div className="mt-3">{signInCta}</div>}
        </div>
      )}

      {isSignedIn && !hasReports && (
        <p className="mt-4 text-sm text-white/70">No reports yet.</p>
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
              const title = report.title?.trim();
              return (
                <li key={report.id}>
                  <button
                    type="button"
                    onClick={() => onSelectReport(report.id)}
                    className="w-full rounded border border-white/30 px-3 py-2 text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">
                        {title && title.length > 0 ? title : "Untitled"}
                      </span>
                      <span className="text-xs text-white/60">{createdAt}</span>
                    </div>
                    <div className="text-xs text-white/70">
                      {label} · {report.period} · {report.businessModel}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="rounded border border-white/30 p-3 text-sm">
            {selected ? (
              <>
                <div className="text-sm font-semibold">
                  {selected.title ?? "Untitled"}
                </div>
                <div className="text-xs text-white/70">
                  {formatLabel(selected.periodLabel ?? "Unlabeled")} ·{" "}
                  {selected.period} · {selected.businessModel}
                </div>
                <div className="mt-3 grid gap-2 text-xs text-white/80">
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
                  <div className="mt-3 rounded border border-white/30 p-2 text-xs text-white/80">
                    <p className="font-semibold">Warnings</p>
                    <ul className="mt-1 list-disc pl-4">
                      {warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-white/70">Select a report to preview.</p>
            )}
          </div>
        </div>
      )}

      {series && series.labels.length > 0 && (
        <div className="mt-4 rounded border border-white/30 bg-black p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Trends</h3>
              <p className="text-xs text-white/70">
                {series.period} snapshots · {series.labels.length} points
              </p>
            </div>
            <div className="text-xs text-white/70">
              Latest:{" "}
              {latestTrendIndex != null
                ? series.labels[latestTrendIndex]
                : "—"}
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[140px_1fr]">
            <div className="rounded border border-white/30 p-2 text-xs">
              <div className="font-semibold">LTGP:CAC</div>
              <div className="text-white/80">
                {latestTrendIndex != null
                  ? formatRatio(series.ltgpToCacRatio[latestTrendIndex] ?? null)
                  : "—"}
              </div>
              <div className="mt-2 font-semibold">CAC</div>
              <div className="text-white/80">
                {latestTrendIndex != null
                  ? formatMoney(series.cac[latestTrendIndex] ?? null)
                  : "—"}
              </div>
            </div>
            <div className="rounded border border-white/30 p-2">
              <Sparkline values={series.ltgpToCacRatio} labels={series.labels} />
            </div>
          </div>
          <div className="mt-3">
            <LineChart
              labels={series.labels}
              series={[
                { name: "LTGP:CAC (x)", values: series.ltgpToCacRatio },
                { name: "CAC ($)", values: series.cac },
              ]}
              formatValue={(value) => value.toFixed(2)}
              yLabel="Trends"
              width={520}
              height={220}
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default ReportsPanel;
