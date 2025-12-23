"use client";

import { useEffect, useMemo, useState } from "react";
import type { KPIInput, KPIResult } from "@/features/kpi/types";
import type { KpiInputPanelProps } from "./types";

const KpiInputPanel = ({
  value,
  onChange,
  onCalculate,
  isCalculating,
  results,
  warnings,
  children,
}: KpiInputPanelProps) => {
  const [churnInputMode, setChurnInputMode] = useState<"retained" | "churned">(
    "retained",
  );

  const periodLabel = useMemo(() => `${value.period} period`, [value.period]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value: nextValue } = event.target;
    const percentFields = ["grossMargin", "retentionRatePerPeriod"];
    const parseValue = () => {
      if (name === "period" || name === "businessModel") {
        return nextValue;
      }
      if (nextValue === "") {
        return undefined;
      }
      const numeric = Number(nextValue);
      if (Number.isNaN(numeric)) {
        return undefined;
      }
      if (percentFields.includes(name)) {
        return numeric / 100;
      }
      return numeric;
    };
    const nextState = {
      ...value,
      [name]: parseValue(),
    } as typeof value;
    onChange(nextState);
  };

  const showRetainedField =
    value.businessModel === "subscription" || value.businessModel === "hybrid";
  const showRetentionRateField =
    value.businessModel === "transactional" || value.businessModel === "hybrid";
  const showActiveCustomersEnd =
    value.businessModel === "transactional" || value.businessModel === "hybrid";

  useEffect(() => {
    const updates: Record<string, number | undefined> = {};
    if (!showRetainedField) {
      if (value.retainedCustomersFromStartAtEnd != null) {
        updates.retainedCustomersFromStartAtEnd = undefined;
      }
      if (value.churnedCustomersPerPeriod != null) {
        updates.churnedCustomersPerPeriod = undefined;
      }
    } else if (churnInputMode === "retained") {
      if (value.churnedCustomersPerPeriod != null) {
        updates.churnedCustomersPerPeriod = undefined;
      }
    } else if (value.retainedCustomersFromStartAtEnd != null) {
      updates.retainedCustomersFromStartAtEnd = undefined;
    }

    if (!showRetentionRateField && value.retentionRatePerPeriod != null) {
      updates.retentionRatePerPeriod = undefined;
    }

    if (!showActiveCustomersEnd && value.activeCustomersEnd != null) {
      updates.activeCustomersEnd = undefined;
    }

    if (Object.keys(updates).length > 0) {
      onChange({ ...value, ...updates } as typeof value);
    }
  }, [
    churnInputMode,
    onChange,
    showActiveCustomersEnd,
    showRetainedField,
    showRetentionRateField,
    value,
  ]);

  useEffect(() => {
    if (!showRetainedField && churnInputMode !== "retained") {
      setChurnInputMode("retained");
    }
  }, [showRetainedField, churnInputMode]);

  const grossMarginError =
    value.grossMargin != null && value.grossMargin > 1
      ? "Gross margin cannot exceed 100%."
      : null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (grossMarginError) {
      return;
    }
    void onCalculate();
  };

  const usd = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
    [],
  );
  const intFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
      }),
    [],
  );

  const displayPercent = (val?: number) =>
    val == null ? "" : Number((val * 100).toFixed(2));
  const displayMoney = (val?: number) =>
    val == null ? "—" : usd.format(val);
  const displayInt = (val?: number) =>
    val == null ? "—" : intFormatter.format(val);

  return (
    <section className="rounded border border-white/30 bg-black p-4 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Inputs</h2>
          <p className="text-sm text-white/70">
            Enter KPI inputs for a single analysis period.
          </p>
        </div>
        {children}
      </div>

      <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1">
          Period
          <select
            name="period"
            value={value.period}
            onChange={handleChange}
            className="rounded border border-white/30 bg-black p-2 text-white"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          Business Model
          <select
            name="businessModel"
            value={value.businessModel}
            onChange={handleChange}
            className="rounded border border-white/30 bg-black p-2 text-white"
          >
            <option value="subscription">Subscription</option>
            <option value="transactional">Transactional</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </label>

        {[
          {
            label: `Revenue (per ${periodLabel})`,
            name: "revenuePerPeriod",
            formatted: displayMoney(value.revenuePerPeriod),
          },
          {
            label: "Gross Margin (%)",
            name: "grossMargin",
            helper: "Before marketing/CAC. Example: 70 = 70%.",
            formatted:
              value.grossMargin == null
                ? "—"
                : `${displayPercent(value.grossMargin)}%`,
          },
          {
            label: `Marketing Spend (per ${periodLabel})`,
            name: "marketingSpendPerPeriod",
            formatted: displayMoney(value.marketingSpendPerPeriod),
          },
          {
            label: `New Customers (per ${periodLabel})`,
            name: "newCustomersPerPeriod",
            formatted: displayInt(value.newCustomersPerPeriod),
          },
          {
            label: "Active Customers Start",
            name: "activeCustomersStart",
            formatted: displayInt(value.activeCustomersStart),
          },
        ].map((field) => (
          <label key={field.name} className="flex flex-col gap-1">
            {field.label}
            <input
              type="number"
              name={field.name}
              value={
                field.name === "grossMargin"
                  ? displayPercent(value.grossMargin)
                  : value[field.name as keyof typeof value] ?? ""
              }
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
            {"helper" in field && field.helper && (
              <span className="text-sm text-white/70">{field.helper}</span>
            )}
            {"formatted" in field && field.formatted && (
              <span className="text-xs text-white/60">
                Formatted: {field.formatted}
              </span>
            )}
            {field.name === "grossMargin" && grossMarginError && (
              <span className="text-sm text-white/80">{grossMarginError}</span>
            )}
          </label>
        ))}

        {showActiveCustomersEnd && (
          <label className="flex flex-col gap-1">
            Active customers at end (per period)
            <input
              type="number"
              name="activeCustomersEnd"
              value={value.activeCustomersEnd ?? ""}
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
            <span className="text-sm text-white/70">
              Transactional/Hybrid: number of unique customers active by period
              end (used for ARPC averaging).
            </span>
            <span className="text-xs text-white/60">
              Formatted: {displayInt(value.activeCustomersEnd)}
            </span>
          </label>
        )}
        <p className="text-sm text-white/70">
          End customers are derived from start customers + new customers − churn
          (or derived churn).
        </p>

        {showRetainedField && (
          <div className="space-y-3 rounded border border-white/30 p-3">
            <p className="font-medium">How do you want to input churn?</p>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="churnMode"
                value="retained"
                checked={churnInputMode === "retained"}
                onChange={() => setChurnInputMode("retained")}
              />
              <span>I know how many start customers remained</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="churnMode"
                value="churned"
                checked={churnInputMode === "churned"}
                onChange={() => setChurnInputMode("churned")}
              />
              <span>I know churned customers</span>
            </label>
          </div>
        )}

        {showRetainedField && churnInputMode === "retained" && (
          <label className="flex flex-col gap-1">
            Customers from start still active at end
            <input
              type="number"
              name="retainedCustomersFromStartAtEnd"
              value={value.retainedCustomersFromStartAtEnd ?? ""}
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
            <span className="text-sm text-white/70">
              Cohort retention: subset of starting customers.
            </span>
            <span className="text-xs text-white/60">
              Formatted: {displayInt(value.retainedCustomersFromStartAtEnd)}
            </span>
          </label>
        )}

        {showRetainedField && churnInputMode === "churned" && (
          <label className="flex flex-col gap-1">
            Churned customers per period
            <input
              type="number"
              name="churnedCustomersPerPeriod"
              value={value.churnedCustomersPerPeriod ?? ""}
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
            <span className="text-xs text-white/60">
              Formatted: {displayInt(value.churnedCustomersPerPeriod)}
            </span>
          </label>
        )}

        {showRetentionRateField && (
          <label className="flex flex-col gap-1">
            Retention rate (repeat purchase rate) per period (%)
            <input
              type="number"
              step="0.01"
              name="retentionRatePerPeriod"
              value={displayPercent(value.retentionRatePerPeriod)}
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
            <span className="text-sm text-white/70">
              Example: 60 means 60% of the period-start cohort repeats.
            </span>
            <span className="text-xs text-white/60">
              Formatted: {displayPercent(value.retentionRatePerPeriod)}%
            </span>
          </label>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded border border-white/60 px-4 py-2 text-white disabled:opacity-50"
            disabled={isCalculating}
          >
            {isCalculating ? "Calculating..." : "Calculate KPIs"}
          </button>
        </div>
      </form>

      {warnings.length > 0 && (
        <div className="mt-4 rounded border border-white/30 p-3 text-sm text-white/80">
          <p className="font-semibold">Warnings</p>
          <ul className="mt-2 list-disc pl-5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {results && (
        <ResultsPanel
          results={results}
          inputs={value}
          usd={usd}
          intFormatter={intFormatter}
        />
      )}
    </section>
  );
};

export default KpiInputPanel;

const ResultsPanel = ({
  results,
  inputs,
  usd,
  intFormatter,
}: {
  results: KPIResult;
  inputs: KPIInput;
  usd: Intl.NumberFormat;
  intFormatter: Intl.NumberFormat;
}) => {
  const pct = (value: number | null) =>
    value == null ? "—" : `${(value * 100).toFixed(2)}%`;

  const ratioX = (value: number | null) =>
    value == null ? "—" : `${value.toFixed(2)}x`;

  const formatMoney = (value: number | null) =>
    value == null ? "—" : usd.format(value);

  const formatInt = (value: number | null) =>
    value == null ? "—" : intFormatter.format(value);

  type ResultKey =
    | "cac"
    | "arpc"
    | "churnRate"
    | "retentionRate"
    | "ltv"
    | "ltgpPerCustomer"
    | "ltgpToCacRatio"
    | "hypotheticalMaxRevenuePerYear"
    | "hypotheticalMaxProfitPerYear"
    | "car"
    | "cacPaybackPeriods";

  const formatMap: Record<ResultKey, () => string> = {
    cac: () => formatMoney(results.cac),
    arpc: () => formatMoney(results.arpc),
    churnRate: () => pct(results.churnRate),
    retentionRate: () => pct(results.retentionRate),
    ltv: () => formatMoney(results.ltv),
    ltgpPerCustomer: () => formatMoney(results.ltgpPerCustomer),
    ltgpToCacRatio: () => ratioX(results.ltgpToCacRatio),
    cacPaybackPeriods: () =>
      results.cacPaybackPeriods == null
        ? "—"
        : `${results.cacPaybackPeriods.toFixed(2)} periods`,
    hypotheticalMaxRevenuePerYear: () =>
      formatMoney(results.hypotheticalMaxRevenuePerYear),
    hypotheticalMaxProfitPerYear: () =>
      formatMoney(results.hypotheticalMaxProfitPerYear),
    car: () => `${formatInt(results.car)} per period`,
  };

  const labelMap: Record<ResultKey, string> = {
    cac: "Customer acquisition cost (CAC)",
    arpc: "Average revenue per customer (ARPC)",
    churnRate: "Churn rate",
    retentionRate: "Retention rate",
    ltv: "Lifetime value (gross margin-adjusted)",
    ltgpPerCustomer: "Lifetime gross profit per customer (LTGP)",
    ltgpToCacRatio: "LTGP:CAC",
    cacPaybackPeriods: "CAC payback (periods)",
    hypotheticalMaxRevenuePerYear: "Hypothetical max revenue per year",
    hypotheticalMaxProfitPerYear: "Hypothetical max profit per year",
    car: "New customers per period",
  };

  const orderedKeys: ResultKey[] = [
    "cac",
    "arpc",
    "churnRate",
    "retentionRate",
    "ltv",
    "ltgpPerCustomer",
    "ltgpToCacRatio",
    "cacPaybackPeriods",
    "hypotheticalMaxRevenuePerYear",
    "hypotheticalMaxProfitPerYear",
    "car",
  ];

  return (
    <div className="mt-4 space-y-4 rounded border border-white/30 p-4 text-white">
      <h2 className="font-semibold">Results</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {orderedKeys.map((key) => (
          <li key={key} className="flex items-center justify-between gap-4">
            <span className="font-medium">{labelMap[key]}</span>
            <span>{formatMap[key]()}</span>
          </li>
        ))}
      </ul>
      <CustomerBridge inputs={inputs} intFormatter={intFormatter} />
    </div>
  );
};

const CustomerBridge = ({
  inputs,
  intFormatter,
}: {
  inputs: KPIInput;
  intFormatter: Intl.NumberFormat;
}) => {
  const start = inputs.activeCustomersStart ?? null;
  const newCustomers = inputs.newCustomersPerPeriod ?? null;
  let derivedChurned: number | null = null;
  if (inputs.churnedCustomersPerPeriod != null) {
    derivedChurned = inputs.churnedCustomersPerPeriod;
  } else if (
    inputs.retainedCustomersFromStartAtEnd != null &&
    inputs.activeCustomersStart != null
  ) {
    derivedChurned = inputs.activeCustomersStart - inputs.retainedCustomersFromStartAtEnd;
  }
  const derivedEnd =
    start != null && newCustomers != null && derivedChurned != null
      ? start + newCustomers - derivedChurned
      : null;

  const formatInt = (value: number | null) =>
    value == null ? "—" : intFormatter.format(value);

  return (
    <div className="rounded border border-white/30 bg-black p-4 text-sm text-white">
      <h3 className="font-semibold">Customer Bridge</h3>
      <ul className="mt-2 space-y-1">
        <li className="flex justify-between gap-4">
          <span>Start customers</span>
          <span>{formatInt(start)}</span>
        </li>
        <li className="flex justify-between gap-4">
          <span>+ New customers</span>
          <span>{formatInt(newCustomers)}</span>
        </li>
        <li className="flex justify-between gap-4">
          <span>- Churned customers (derived)</span>
          <span>{formatInt(derivedChurned)}</span>
        </li>
        <li className="flex justify-between gap-4 border-t border-gray-200 pt-1 font-medium">
          <span>= Derived end customers</span>
          <span>{formatInt(derivedEnd)}</span>
        </li>
      </ul>
      {derivedChurned == null && (
        <p className="mt-2 text-xs text-white/70">
          Provide churned or retained-from-start customers to unlock the customer
          bridge.
        </p>
      )}
    </div>
  );
};
