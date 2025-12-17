"use client";

import { useMemo, useState } from "react";
import type { KPIInput, KPIResult } from "@/features/kpi/types";

export type ReportSummary = {
  id: number;
  title: string | null;
  periodLabel?: string | null;
  createdAt: Date | string | null;
  period: string;
  businessModel: string;
  cohortLabel?: string | null;
  channel?: string | null;
  inputJson: KPIInput;
  resultJson: KPIResult;
  warningsJson: string[];
};

export const ReportComparison = ({ reports }: { reports: ReportSummary[] }) => {
  const [selected, setSelected] = useState<number[]>([]);

  const toggleReport = (id: number) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length === 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const selectedReports = selected
    .map((id) => reports.find((r) => r.id === id))
    .filter((r): r is ReportSummary => Boolean(r));

  const usd = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }),
    [],
  );

const metrics = [
  { key: "cac", label: "CAC", format: "money" },
  { key: "arpc", label: "ARPC", format: "money" },
  { key: "churnRate", label: "Churn rate", format: "percent" },
  { key: "retentionRate", label: "Retention rate", format: "percent" },
  {
    key: "ltgpPerCustomer",
    label: "LTGP per customer",
    format: "money",
  },
  { key: "ltgpToCacRatio", label: "LTGP:CAC", format: "ratio" },
  {
    key: "cacPaybackPeriods",
    label: "CAC payback (periods)",
    format: "periods",
  },
  {
    key: "hypotheticalMaxRevenuePerYear",
    label: "Max revenue / year",
    format: "money",
  },
    {
      key: "hypotheticalMaxProfitPerYear",
      label: "Max profit / year",
      format: "money",
    },
  ] as const;

const formatValue = (value: number | null | undefined, format: string) => {
  if (value == null) {
    return "—";
  }
  switch (format) {
    case "money":
      return usd.format(value);
    case "percent":
      return `${(value * 100).toFixed(2)}%`;
    case "ratio":
      return `${value.toFixed(2)}x`;
    case "periods":
      return `${value.toFixed(2)} periods`;
      default:
        return value.toFixed(2);
    }
  };

  const rows =
    selectedReports.length === 2
      ? metrics.map((metric) => {
          const a = selectedReports[0]!.resultJson[metric.key] as number | null;
          const b = selectedReports[1]!.resultJson[metric.key] as number | null;
          const delta = a != null && b != null ? b - a : null;
          const percent =
            delta != null && a != null && a !== 0 ? (delta / a) * 100 : null;

          return {
            metric,
            a,
            b,
            delta,
            percent,
          };
        })
      : [];

  return (
    <div className="rounded border border-gray-200 bg-white dark:bg-gray-800 p-4 text-gray-900 dark:text-gray-100">
      <h2 className="text-xl font-semibold">Compare Reports</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Select up to two reports to compare their KPIs.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        {reports.map((report) => (
          <label key={report.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes(report.id)}
              onChange={() => toggleReport(report.id)}
            />
            <span>
              {report.title ?? "Untitled"} —{" "}
              {report.periodLabel ?? "Unlabeled"} ({report.period} /{" "}
              {report.businessModel})
            </span>
          </label>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="mt-6 overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 p-2 text-left">Metric</th>
                <th className="border border-gray-200 p-2 text-left">Report A</th>
                <th className="border border-gray-200 p-2 text-left">Report B</th>
                <th className="border border-gray-200 p-2 text-left">Delta</th>
                <th className="border border-gray-200 p-2 text-left">% Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.metric.key}>
                  <td className="border border-gray-200 p-2">
                    {row.metric.label}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {formatValue(row.a, row.metric.format)}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {formatValue(row.b, row.metric.format)}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {row.delta == null
                      ? "—"
                      : formatValue(row.delta, row.metric.format)}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {row.percent == null ? "—" : `${row.percent.toFixed(2)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
