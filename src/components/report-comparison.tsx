"use client";

import { useState } from "react";
import type { KPIInput, KPIResult } from "@/features/kpi/types";

export type ReportSummary = {
  id: number;
  title: string | null;
  createdAt: Date | string | null;
  period: string;
  businessModel: string;
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

  const metrics = [
    "cac",
    "arpc",
    "churnRate",
    "retentionRate",
    "ltv",
    "ltgpPerCustomer",
    "ltgpToCacRatio",
    "growthAssessment",
    "hypotheticalMaxRevenuePerYear",
    "hypotheticalMaxProfitPerYear",
    "car",
  ] as const;

  const formatValue = (value: number | null | undefined) =>
    value == null ? "—" : value.toFixed(2);

  const rows =
    selectedReports.length === 2
      ? metrics.map((metric) => {
          const a = selectedReports[0]!.resultJson[metric];
          const b = selectedReports[1]!.resultJson[metric];
          const delta =
            a != null && b != null ? (b as number) - (a as number) : null;
          const percent =
            delta != null && a != null && a !== 0 ? (delta / (a as number)) * 100 : null;

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
    <div className="rounded border border-gray-200 p-4">
      <h2 className="text-xl font-semibold">Compare Reports</h2>
      <p className="text-sm text-gray-600">
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
              {report.title ?? "Untitled"} ({report.period} / {report.businessModel})
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
                <tr key={row.metric}>
                  <td className="border border-gray-200 p-2">{row.metric}</td>
                  <td className="border border-gray-200 p-2">
                    {formatValue(row.a)}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {formatValue(row.b)}
                  </td>
                  <td className="border border-gray-200 p-2">
                    {row.delta == null ? "—" : formatValue(row.delta)}
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
