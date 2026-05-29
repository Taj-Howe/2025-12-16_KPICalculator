"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  buildPricingExplorerReport,
  pricingSensitivityPresets,
  type PricingExplorerReport,
  type PricingSensitivityAssumptions,
  type PricingSensitivityPreset,
  type PricingScenarioResult,
} from "@/features/kpi/pricing-explorer";
import type { KpiEvaluation } from "@/features/kpi/types";
import {
  FieldBlock,
  SelectField,
  fieldClassName,
  panelClassName,
} from "./form-primitives";
import { formatMoney, formatPercent, formatRatio } from "./formatters";

const presetOptions: PricingSensitivityPreset[] = [
  "low",
  "base",
  "high",
  "manual",
];

const presetLabel = (preset: PricingSensitivityPreset) => {
  switch (preset) {
    case "low":
      return "Low sensitivity";
    case "high":
      return "High sensitivity";
    case "manual":
      return "Manual";
    default:
      return "Base sensitivity";
  }
};

const verdictLabel = (scenario: PricingScenarioResult) => {
  if (scenario.isBest) {
    return "Best under assumptions";
  }
  switch (scenario.verdict) {
    case "baseline":
      return "Baseline";
    case "works_under_assumptions":
      return "Works";
    case "fragile_gain":
      return "Fragile gain";
    case "worse_than_baseline":
      return "Worse";
    case "incomplete":
      return "Incomplete";
    default:
      return "Best under assumptions";
  }
};

const formatDelta = (value: number) =>
  `${value > 0 ? "+" : ""}${(value * 100).toFixed(0)}%`;

const formatCount = (value: number | null) =>
  value == null
    ? "—"
    : value.toLocaleString("en-US", { maximumFractionDigits: 2 });

const formatPeriods = (value: number | null) =>
  value == null ? "—" : `${value.toFixed(2)} periods`;

const formatPercentPoints = (value: number) => (value * 100).toFixed(2);

const formatVelocityChange = (value: number) => (value * 100).toFixed(1);

const bestSummary = (report: PricingExplorerReport) => {
  const best = report.bestScenario;
  if (!best) {
    return "No pricing scenario has enough data to compare.";
  }
  if (best.isBaseline) {
    return "Baseline pricing is strongest under these assumptions.";
  }
  return `${formatDelta(best.priceDelta)} price is strongest under these assumptions.`;
};

const PricingExplorerCard = ({
  evaluation,
}: {
  evaluation: KpiEvaluation;
}) => {
  const [assumptions, setAssumptions] =
    useState<PricingSensitivityAssumptions>(pricingSensitivityPresets.base);

  const report = useMemo(
    () => buildPricingExplorerReport({ evaluation, assumptions }),
    [evaluation, assumptions],
  );

  const handlePresetChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const preset = event.target.value as PricingSensitivityPreset;
    if (preset === "manual") {
      setAssumptions((current) => ({ ...current, preset: "manual" }));
      return;
    }
    setAssumptions(pricingSensitivityPresets[preset]);
  };

  const updateChurnAssumption = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(event.target.value);
    if (!Number.isNaN(nextValue)) {
      setAssumptions((current) => ({
        ...current,
        preset: "manual",
        churnPpPer10PctPriceChange: nextValue / 100,
      }));
    }
  };

  const updateSalesVelocityAssumption = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const nextValue = Number(event.target.value);
    if (!Number.isNaN(nextValue)) {
      setAssumptions((current) => ({
        ...current,
        preset: "manual",
        salesVelocityPctPer10PctPriceChange: nextValue / 100,
      }));
    }
  };

  return (
    <section className={panelClassName}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/36">
            Pricing Explorer
          </p>
          <h3 className="mt-2 text-base font-semibold text-white">
            Price, churn, and sales velocity tradeoff
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-white/58">
            Compare price points with explicit churn and acquisition assumptions.
          </p>
        </div>
        {report.eligible && (
          <div className="rounded-[16px] border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white">
            {bestSummary(report)}
          </div>
        )}
      </div>

      {!report.eligible ? (
        <div className="mt-4 rounded-[18px] border border-white/10 bg-black/15 p-4 text-sm text-white/62">
          {report.ineligibleReason}
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <FieldBlock label="Sensitivity preset">
              <SelectField
                value={assumptions.preset}
                onChange={handlePresetChange}
              >
                {presetOptions.map((preset) => (
                  <option key={preset} value={preset}>
                    {presetLabel(preset)}
                  </option>
                ))}
              </SelectField>
            </FieldBlock>
            <FieldBlock
              label="Churn change per +10% price"
              helper="Percentage points"
            >
              <input
                type="number"
                value={formatPercentPoints(
                  assumptions.churnPpPer10PctPriceChange,
                )}
                step="0.05"
                onChange={updateChurnAssumption}
                className={fieldClassName}
              />
            </FieldBlock>
            <FieldBlock
              label="Sales velocity change per +10% price"
              helper="Percent change"
            >
              <input
                type="number"
                value={formatVelocityChange(
                  assumptions.salesVelocityPctPer10PctPriceChange,
                )}
                step="0.5"
                onChange={updateSalesVelocityAssumption}
                className={fieldClassName}
              />
            </FieldBlock>
          </div>

          {report.grossProfitAssumption && (
            <p className="mt-3 text-xs text-white/48">
              {report.grossProfitAssumption}
            </p>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[980px] w-full border-separate border-spacing-0 text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-white/38">
                <tr>
                  <th className="border-b border-white/8 px-3 py-2">Price</th>
                  <th className="border-b border-white/8 px-3 py-2">ARPC</th>
                  <th className="border-b border-white/8 px-3 py-2">Sales velocity</th>
                  <th className="border-b border-white/8 px-3 py-2">Churn</th>
                  <th className="border-b border-white/8 px-3 py-2">Break-even churn</th>
                  <th className="border-b border-white/8 px-3 py-2">Projected profit</th>
                  <th className="border-b border-white/8 px-3 py-2">LTGP:CAC</th>
                  <th className="border-b border-white/8 px-3 py-2">Payback</th>
                  <th className="border-b border-white/8 px-3 py-2">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {report.scenarios.map((scenario) => (
                  <tr
                    key={scenario.id}
                    className={
                      scenario.isBest
                        ? "bg-emerald-400/10 text-white"
                        : "text-white/78"
                    }
                  >
                    <td className="border-b border-white/6 px-3 py-3 font-medium">
                      {scenario.isBaseline ? "Baseline" : formatDelta(scenario.priceDelta)}
                    </td>
                    <td className="border-b border-white/6 px-3 py-3">
                      {formatMoney(scenario.price)}
                    </td>
                    <td className="border-b border-white/6 px-3 py-3">
                      {formatCount(scenario.salesVelocityPerMonth)}/mo
                    </td>
                    <td className="border-b border-white/6 px-3 py-3">
                      {formatPercent(scenario.churnRate)}
                    </td>
                    <td className="border-b border-white/6 px-3 py-3">
                      {formatPercent(scenario.breakEvenChurnRate)}
                    </td>
                    <td className="border-b border-white/6 px-3 py-3">
                      {formatMoney(scenario.results.projectedProfitNextYear)}
                    </td>
                    <td className="border-b border-white/6 px-3 py-3">
                      {formatRatio(scenario.results.ltgpToCacRatio)}
                    </td>
                    <td className="border-b border-white/6 px-3 py-3">
                      {formatPeriods(scenario.results.cacPaybackPeriods)}
                    </td>
                    <td className="border-b border-white/6 px-3 py-3">
                      {verdictLabel(scenario)}
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

export default PricingExplorerCard;
