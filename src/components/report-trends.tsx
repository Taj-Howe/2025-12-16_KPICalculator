"use client";

import { useEffect, useState } from "react";
import type { KpiPeriod } from "@/features/kpi/types";
import Sparkline from "./Sparkline";
import LineChart from "./LineChart";

type SeriesResponse = {
  series: {
    period: KpiPeriod;
    labels: string[];
    customersStart: (number | null)[];
    newCustomers: (number | null)[];
    churnRate: (number | null)[];
    retentionRate: (number | null)[];
    cac: (number | null)[];
    arpc: (number | null)[];
    ltgpPerCustomer: (number | null)[];
    ltgpToCacRatio: (number | null)[];
    cacPaybackPeriods: (number | null)[];
    maxRevenuePerYear: (number | null)[];
    maxProfitPerYear: (number | null)[];
  };
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dollar = (value: number | null) =>
  value == null ? "—" : usd.format(value);

const formatMoney = (value: number | null) =>
  value == null ? "—" : usd.format(value);

const formatPercent = (value: number | null) =>
  value == null ? "—" : `${(value * 100).toFixed(2)}%`;

const formatRatio = (value: number | null) =>
  value == null ? "—" : `${value.toFixed(2)}x`;

const metricOptions = [
  {
    key: "ltgpToCacRatio",
    label: "LTGP:CAC (x)",
    formatter: (n: number) => `${n.toFixed(2)}x`,
  },
  {
    key: "cac",
    label: "CAC ($)",
    formatter: (n: number) => dollar(n),
  },
  {
    key: "cacPaybackPeriods",
    label: "CAC Payback (periods)",
    formatter: (n: number) => `${n.toFixed(1)} periods`,
  },
  {
    key: "arpc",
    label: "ARPC ($)",
    formatter: (n: number) => dollar(n),
  },
  {
    key: "maxProfitPerYear",
    label: "Max Profit / Year ($)",
    formatter: (n: number) => dollar(n),
  },
] as const;

export const ReportTrends = () => {
  const [series, setSeries] = useState<SeriesResponse["series"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<KpiPeriod>("monthly");
  const [metricKey, setMetricKey] =
    useState<(typeof metricOptions)[number]["key"]>("ltgpToCacRatio");
  const [compareKey, setCompareKey] =
    useState<(typeof metricOptions)[number]["key"] | "none">("none");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/reports/series?period=${period}`);
        if (!res.ok) {
          throw new Error("Unable to load trends.");
        }
        const data = (await res.json()) as SeriesResponse;
        setSeries(data.series);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error.");
        setSeries(null);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    void load();
  }, [period]);

  if (loading) {
    return (
      <section className="rounded border border-gray-200 bg-white dark:bg-gray-800 p-4 text-gray-900 dark:text-gray-100">
        <h2 className="text-xl font-semibold">Trends</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">Loading…</p>
      </section>
    );
  }

  if (error || !series) {
    return (
      <section className="rounded border border-gray-200 bg-white dark:bg-gray-800 p-4 text-gray-900 dark:text-gray-100">
        <h2 className="text-xl font-semibold">Trends</h2>
        <p className="text-sm text-red-600">{error ?? "Unable to load trends."}</p>
      </section>
    );
  }

  const selectedMetric = metricOptions.find((m) => m.key === metricKey) ?? metricOptions[0];
  const selectedValues = series[selectedMetric.key as keyof typeof series] as (number | null)[];

  const compareMetric =
    compareKey === "none"
      ? null
      : metricOptions.find((m) => m.key === compareKey) ?? null;
  const compareValues = compareMetric
    ? (series[compareMetric.key as keyof typeof series] as (number | null)[])
    : null;

  const latestIndex =
    selectedValues.length > 0
      ? [...selectedValues]
          .map((value, index) => ({ value, index }))
          .filter((p) => p.value != null)
          .map((p) => p.index)
          .pop()
      : undefined;
  const prevIndex =
    latestIndex != null
      ? [...selectedValues]
          .slice(0, latestIndex)
          .map((value, index) => ({ value, index }))
          .filter((p) => p.value != null)
          .map((p) => p.index)
          .pop()
      : undefined;

  const latestValue =
    latestIndex != null ? selectedValues[latestIndex] ?? null : null;
  const prevValue =
    prevIndex != null ? selectedValues[prevIndex] ?? null : null;

  const latestLabel =
    latestIndex != null ? series.labels[latestIndex] ?? "" : "";

  const formattedLatest =
    latestValue == null ? "—" : selectedMetric.formatter(latestValue);

  const change =
    latestValue != null && prevValue != null ? latestValue - prevValue : null;
  const changeDisplay =
    change == null ? "—" : selectedMetric.formatter(change);

  const rows = series.labels.map((label, idx) => ({
    label,
    cac: series.cac[idx] ?? null,
    ltgpPerCustomer: series.ltgpPerCustomer[idx] ?? null,
    ltgpToCacRatio: series.ltgpToCacRatio[idx] ?? null,
    cacPaybackPeriods: series.cacPaybackPeriods[idx] ?? null,
    churnRate: series.churnRate[idx] ?? null,
    arpc: series.arpc[idx] ?? null,
    maxProfitPerYear: series.maxProfitPerYear[idx] ?? null,
  }));

  return (
    <section className="rounded border border-gray-200 bg-white dark:bg-gray-800 p-4 text-gray-900 dark:text-gray-100">
      <h2 className="text-xl font-semibold">Trends</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          Period
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as KpiPeriod)}
            className="rounded border border-gray-300 p-1 text-sm"
          >
            <option value="monthly">Monthly labels</option>
            <option value="quarterly">Quarterly labels</option>
            <option value="yearly">Yearly labels</option>
          </select>
        </label>
        <span className="text-xs text-gray-600 dark:text-gray-300">
          Only reports with period labels appear here.
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Metric
          <select
            value={metricKey}
            onChange={(e) =>
              setMetricKey(e.target.value as (typeof metricOptions)[number]["key"])
            }
            className="rounded border border-gray-300 p-1 text-sm"
          >
            {metricOptions.map((metric) => (
              <option key={metric.key} value={metric.key}>
                {metric.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-3 text-xs text-gray-700 dark:text-gray-300">
          <span>
            Latest ({latestLabel || "—"}): <strong>{formattedLatest}</strong>
          </span>
          <span>
            Change vs previous: <strong>{changeDisplay}</strong>
          </span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          Compare to
          <select
            value={compareKey}
            onChange={(e) =>
              setCompareKey(
                e.target.value as (typeof metricOptions)[number]["key"] | "none",
              )
            }
            className="rounded border border-gray-300 p-1 text-sm"
          >
            <option value="none">None</option>
            {metricOptions.map((metric) => (
              <option key={metric.key} value={metric.key}>
                {metric.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-700 dark:text-gray-300">No report history yet.</p>
      ) : (
        <>
          <div className="mt-4 overflow-auto rounded border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
            <LineChart
              labels={series.labels}
              series={[
                { name: selectedMetric.label, values: selectedValues },
                ...(compareMetric && compareValues
                  ? [{ name: compareMetric.label, values: compareValues }]
                  : []),
              ]}
              formatValue={(n) => selectedMetric.formatter(n)}
              yLabel={selectedMetric.label}
              width={640}
              height={240}
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SparklineCard
              label="LTGP:CAC"
              series={series.ltgpToCacRatio}
              labels={series.labels}
              format={(value) => (value == null ? "—" : `${value.toFixed(2)}x`)}
            />
            <SparklineCard
              label="CAC payback (periods)"
              series={series.cacPaybackPeriods}
              labels={series.labels}
              format={(value) =>
                value == null ? "—" : `${value.toFixed(2)} periods`
              }
            />
          </div>
          <div className="mt-4 overflow-auto">
            <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 p-2 text-left">Period label</th>
                <th className="border border-gray-200 p-2 text-left">CAC</th>
                <th className="border border-gray-200 p-2 text-left">
                  LTGP/customer
                </th>
                <th className="border border-gray-200 p-2 text-left">
                  LTGP:CAC
                </th>
                <th className="border border-gray-200 p-2 text-left">
                  Payback
                </th>
                <th className="border border-gray-200 p-2 text-left">
                  Churn
                </th>
                <th className="border border-gray-200 p-2 text-left">ARPC</th>
                <th className="border border-gray-200 p-2 text-left">
                  Max Profit / Year
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.label}-${index}`}>
                  <td className="border border-gray-200 p-2">
                    {row.label || "—"}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {formatMoney(row.cac)}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {formatMoney(row.ltgpPerCustomer)}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {formatRatio(row.ltgpToCacRatio)}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {row.cacPaybackPeriods == null
                      ? "—"
                      : `${row.cacPaybackPeriods.toFixed(2)} periods`}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {formatPercent(row.churnRate)}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {formatMoney(row.arpc)}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {formatMoney(row.maxProfitPerYear)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </section>
  );
};

const SparklineCard = ({
  label,
  series,
  labels,
  format,
}: {
  label: string;
  series: (number | null)[];
  labels: string[];
  format: (value: number | null) => string;
}) => {
  const latest =
    series.length > 0 ? series[series.length - 1] ?? null : null;

  return (
    <div className="rounded border border-gray-200 bg-white dark:bg-gray-800 p-3 text-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </span>
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {format(latest)}
        </span>
      </div>
      <div className="mt-2">
        <Sparkline values={series} labels={labels} />
      </div>
    </div>
  );
};
