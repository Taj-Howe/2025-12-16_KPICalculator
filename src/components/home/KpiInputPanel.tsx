"use client";

import { useMemo } from "react";
import type { OfferInput, KPIResult } from "@/features/kpi/types";
import type { KpiInputPanelProps } from "./types";

const offerTypeOptions = [
  { value: "subscription", label: "Subscription Offer", enabled: true },
  { value: "one_time", label: "One-Time Offer", enabled: false },
  { value: "installment", label: "Installment Offer", enabled: false },
  { value: "usage_based", label: "Usage-Based Offer", enabled: false },
  { value: "service_retainer", label: "Service Retainer", enabled: false },
] as const;

type NumericFieldName =
  | "revenuePerPeriod"
  | "newCustomersPerPeriod"
  | "activeCustomersStart";
type NumericField = {
  label: string;
  name: NumericFieldName;
  formatted: string;
  step?: string;
};

const KpiInputPanel = ({
  value,
  onChange,
  onCalculate,
  isCalculating,
  results,
  warnings,
  children,
}: KpiInputPanelProps) => {
  const churnInputMode =
    value.churnedCustomersPerPeriod != null && value.retainedCustomersFromStartAtEnd == null
      ? "churned"
      : "retained";
  const revenueInputMode = value.revenueInputMode ?? "total_revenue";
  const grossProfitInputMode = value.grossProfitInputMode ?? "margin";
  const cacInputMode = value.cacInputMode ?? "derived";
  const retentionInputMode = value.retentionInputMode ?? "counts";
  const showActiveCustomersStart =
    retentionInputMode === "counts" || revenueInputMode === "total_revenue";

  const periodLabel = `${value.analysisPeriod} period`;

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

  const percentInputValue = (val?: number) =>
    val == null ? "" : Number((val * 100).toFixed(2));
  const percentText = (val?: number) =>
    val == null ? "-" : `${Number((val * 100).toFixed(2))}%`;
  const displayMoney = (val?: number) => (val == null ? "-" : usd.format(val));
  const displayInt = (val?: number) => (val == null ? "-" : intFormatter.format(val));

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value: nextValue } = event.target;
    const parseValue = () => {
      if (
        name === "analysisPeriod" ||
        name === "offerType" ||
        name === "offerName" ||
        name === "offerId" ||
        name === "revenueInputMode"
      ) {
        return nextValue;
      }
      if (nextValue === "") {
        return undefined;
      }
      const numeric = Number(nextValue);
      if (Number.isNaN(numeric)) {
        return undefined;
      }
      if (name === "grossMargin") {
        return numeric / 100;
      }
      return numeric;
    };

    onChange({
      ...value,
      [name]: parseValue(),
    });
  };

  const setRevenueMode = (mode: "total_revenue" | "direct_arpc") => {
    onChange({
      ...value,
      revenueInputMode: mode,
      revenuePerPeriod: mode === "total_revenue" ? value.revenuePerPeriod : undefined,
      directArpc: mode === "direct_arpc" ? value.directArpc : undefined,
    });
  };

  const setChurnMode = (mode: "retained" | "churned") => {
    if (mode === "retained") {
      onChange({
        ...value,
        churnedCustomersPerPeriod: undefined,
      });
      return;
    }

    onChange({
      ...value,
      retainedCustomersFromStartAtEnd: undefined,
    });
  };

  const setRetentionMode = (mode: "counts" | "rate") => {
    onChange({
      ...value,
      retentionInputMode: mode,
      directChurnRatePerPeriod:
        mode === "rate" ? value.directChurnRatePerPeriod : undefined,
      churnedCustomersPerPeriod:
        mode === "counts" ? value.churnedCustomersPerPeriod : undefined,
      retainedCustomersFromStartAtEnd:
        mode === "counts" ? value.retainedCustomersFromStartAtEnd : undefined,
    });
  };

  const setGrossProfitMode = (mode: "margin" | "costs") => {
    onChange({
      ...value,
      grossProfitInputMode: mode,
      grossMargin: mode === "margin" ? value.grossMargin : undefined,
      deliveryCostPerCustomerPerPeriod:
        mode === "costs" ? value.deliveryCostPerCustomerPerPeriod : undefined,
      fixedDeliveryCostPerPeriod:
        mode === "costs" ? value.fixedDeliveryCostPerPeriod : undefined,
    });
  };

  const setCacMode = (mode: "derived" | "direct") => {
    onChange({
      ...value,
      cacInputMode: mode,
      marketingSpendPerPeriod:
        mode === "derived" ? value.marketingSpendPerPeriod : undefined,
      directCac: mode === "direct" ? value.directCac : undefined,
    });
  };

  const grossMarginError =
    grossProfitInputMode === "margin" &&
    value.grossMargin != null &&
    value.grossMargin > 1
      ? "Gross margin cannot exceed 100%."
      : null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (grossMarginError) {
      return;
    }
    void onCalculate();
  };

  const numericFields: NumericField[] = [
    {
      label:
        retentionInputMode === "rate"
          ? `Sales Velocity / New Customers (per ${periodLabel})`
          : `New Customers (per ${periodLabel})`,
      name: "newCustomersPerPeriod" as const,
      formatted: displayInt(value.newCustomersPerPeriod),
    },
    {
      label: "Active Customers Start",
      name: "activeCustomersStart" as const,
      formatted: displayInt(value.activeCustomersStart),
    },
  ].filter((field) => field.name !== "activeCustomersStart");

  return (
    <section className="rounded border border-white/30 bg-black p-4 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Offer Inputs</h2>
          <p className="text-sm text-white/70">
            Model one offer at a time. Use top-down business inputs or direct unit economics for the same subscription.
          </p>
        </div>
        {children}
      </div>

      <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            Offer name
            <input
              type="text"
              name="offerName"
              value={value.offerName}
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
          </label>

          <label className="flex flex-col gap-1">
            Offer ID
            <input
              type="text"
              name="offerId"
              value={value.offerId}
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
            <span className="text-xs text-white/60">
              Stable key for this offer in saved reports.
            </span>
          </label>
        </div>

        <label className="flex flex-col gap-1">
          Offer type
          <select
            name="offerType"
            value={value.offerType}
            onChange={handleChange}
            className="rounded border border-white/30 bg-black p-2 text-white"
          >
            {offerTypeOptions.map((option) => (
              <option key={option.value} value={option.value} disabled={!option.enabled}>
                {option.label}
                {!option.enabled ? " (coming next)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          Analysis period
          <select
            name="analysisPeriod"
            value={value.analysisPeriod}
            onChange={handleChange}
            className="rounded border border-white/30 bg-black p-2 text-white"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>

        <div className="rounded border border-white/30 p-3">
          <p className="font-medium">How do you want to input revenue?</p>
          <p className="mt-1 text-sm text-white/70">
            Use total revenue if you want company-level scaling. Use direct subscription price / ARPC for pure unit economics.
          </p>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="revenueInputMode"
                value="total_revenue"
                checked={revenueInputMode === "total_revenue"}
                onChange={() => setRevenueMode("total_revenue")}
              />
              <span>Use total revenue</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="revenueInputMode"
                value="direct_arpc"
                checked={revenueInputMode === "direct_arpc"}
                onChange={() => setRevenueMode("direct_arpc")}
              />
              <span>Use subscription price / ARPC directly</span>
            </label>
          </div>
        </div>

        {revenueInputMode === "total_revenue" ? (
          <label className="flex flex-col gap-1">
            Revenue (per {periodLabel})
            <input
              type="number"
              name="revenuePerPeriod"
              value={value.revenuePerPeriod ?? ""}
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
            <span className="text-xs text-white/60">
              Formatted: {displayMoney(value.revenuePerPeriod)}
            </span>
          </label>
        ) : (
          <label className="flex flex-col gap-1">
            Subscription price / ARPC (per {periodLabel})
            <input
              type="number"
              name="directArpc"
              value={value.directArpc ?? ""}
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
            <span className="text-sm text-white/70">
              Example: enter 3000 for one $3,000/month subscription.
            </span>
            <span className="text-xs text-white/60">
              Formatted: {displayMoney(value.directArpc)}
            </span>
          </label>
        )}

        <div className="rounded border border-white/30 p-3">
          <p className="font-medium">How do you want to model gross profit?</p>
          <p className="mt-1 text-sm text-white/70">
            Choose margin if you know the overall gross margin. Choose delivery costs if you know the per-customer cost to serve the subscription.
          </p>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="grossProfitInputMode"
                value="margin"
                checked={grossProfitInputMode === "margin"}
                onChange={() => setGrossProfitMode("margin")}
              />
              <span>Use gross margin %</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="grossProfitInputMode"
                value="costs"
                checked={grossProfitInputMode === "costs"}
                onChange={() => setGrossProfitMode("costs")}
              />
              <span>Use delivery costs per customer</span>
            </label>
          </div>
        </div>

        <div className="rounded border border-white/30 p-3">
          <p className="font-medium">How do you want to input CAC?</p>
          <p className="mt-1 text-sm text-white/70">
            Derive CAC from marketing spend and new customers, or enter CAC directly if you already know it.
          </p>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="cacInputMode"
                value="derived"
                checked={cacInputMode === "derived"}
                onChange={() => setCacMode("derived")}
              />
              <span>Derive CAC from spend</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="cacInputMode"
                value="direct"
                checked={cacInputMode === "direct"}
                onChange={() => setCacMode("direct")}
              />
              <span>Enter CAC directly</span>
            </label>
          </div>
        </div>

        {numericFields.map((field) => (
          <label key={field.name} className="flex flex-col gap-1">
            {field.label}
            <input
              type="number"
              name={field.name}
              value={value[field.name] ?? ""}
              step={field.step}
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
            <span className="text-xs text-white/60">Formatted: {field.formatted}</span>
          </label>
        ))}

        {showActiveCustomersStart && (
          <label className="flex flex-col gap-1">
            Active Customers Start
            <input
              type="number"
              name="activeCustomersStart"
              value={value.activeCustomersStart ?? ""}
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
            <span className="text-sm text-white/70">
              Required for cohort-count churn and for deriving ARPC from total revenue.
            </span>
            <span className="text-xs text-white/60">
              Formatted: {displayInt(value.activeCustomersStart)}
            </span>
          </label>
        )}

        {grossProfitInputMode === "margin" ? (
          <label className="flex flex-col gap-1">
            Gross Margin (%)
            <input
              type="number"
              name="grossMargin"
              value={percentInputValue(value.grossMargin)}
              step="0.1"
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
            <span className="text-sm text-white/70">
              Before acquisition cost. Example: 70 = 70%.
            </span>
            <span className="text-xs text-white/60">
              Formatted: {percentText(value.grossMargin)}
            </span>
            {grossMarginError && (
              <span className="text-sm text-white/80">{grossMarginError}</span>
            )}
          </label>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              Delivery cost per active customer (per {periodLabel})
              <input
                type="number"
                name="deliveryCostPerCustomerPerPeriod"
                value={value.deliveryCostPerCustomerPerPeriod ?? ""}
                onChange={handleChange}
                className="rounded border border-white/30 bg-black p-2 text-white"
              />
              <span className="text-sm text-white/70">
                Example: monthly AI token cost, fulfillment, or support cost per active subscription.
              </span>
              <span className="text-xs text-white/60">
                Formatted: {displayMoney(value.deliveryCostPerCustomerPerPeriod)}
              </span>
            </label>

            <label className="flex flex-col gap-1">
              Fixed delivery cost (optional, per {periodLabel})
              <input
                type="number"
                name="fixedDeliveryCostPerPeriod"
                value={value.fixedDeliveryCostPerPeriod ?? ""}
                onChange={handleChange}
                className="rounded border border-white/30 bg-black p-2 text-white"
              />
              <span className="text-sm text-white/70">
                Shared infrastructure or software cost allocated across active customers.
              </span>
              <span className="text-xs text-white/60">
                Formatted: {displayMoney(value.fixedDeliveryCostPerPeriod)}
              </span>
            </label>
          </div>
        )}

        {cacInputMode === "derived" ? (
          <label className="flex flex-col gap-1">
            Marketing Spend (per {periodLabel})
            <input
              type="number"
              name="marketingSpendPerPeriod"
              value={value.marketingSpendPerPeriod ?? ""}
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
            <span className="text-xs text-white/60">
              Formatted: {displayMoney(value.marketingSpendPerPeriod)}
            </span>
          </label>
        ) : (
          <label className="flex flex-col gap-1">
            Direct CAC
            <input
              type="number"
              name="directCac"
              value={value.directCac ?? ""}
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
            <span className="text-sm text-white/70">
              Use this if you already know customer acquisition cost and do not want to back it out from spend.
            </span>
            <span className="text-xs text-white/60">
              Formatted: {displayMoney(value.directCac)}
            </span>
          </label>
        )}

        <div className="rounded border border-white/30 p-3">
          <p className="font-medium">How do you want to model churn?</p>
          <p className="mt-1 text-sm text-white/70">
            Use direct churn rate if you know the percentage already. Use cohort counts if you track retained or churned customers directly.
          </p>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="retentionInputMode"
                value="counts"
                checked={retentionInputMode === "counts"}
                onChange={() => setRetentionMode("counts")}
              />
              <span>Use cohort counts</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="retentionInputMode"
                value="rate"
                checked={retentionInputMode === "rate"}
                onChange={() => setRetentionMode("rate")}
              />
              <span>Use churn rate directly</span>
            </label>
          </div>
        </div>

        {retentionInputMode === "counts" && (
          <div className="space-y-3 rounded border border-white/30 p-3">
            <p className="font-medium">How do you want to input churn counts?</p>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="churnMode"
                value="retained"
                checked={churnInputMode === "retained"}
                onChange={() => setChurnMode("retained")}
              />
              <span>I know how many start customers remained</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="churnMode"
                value="churned"
                checked={churnInputMode === "churned"}
                onChange={() => setChurnMode("churned")}
              />
              <span>I know how many customers churned</span>
            </label>
          </div>
        )}

        {retentionInputMode === "rate" ? (
          <label className="flex flex-col gap-1">
            Churn rate per {periodLabel} (%)
            <input
              type="number"
              name="directChurnRatePerPeriod"
              value={percentInputValue(value.directChurnRatePerPeriod)}
              step="0.1"
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
            <span className="text-sm text-white/70">
              Example: enter 10 for a 10% monthly churn rate.
            </span>
            <span className="text-xs text-white/60">
              Formatted: {percentText(value.directChurnRatePerPeriod)}
            </span>
          </label>
        ) : churnInputMode === "retained" ? (
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
              Cohort retention for the starting customer base.
            </span>
            <span className="text-xs text-white/60">
              Formatted: {displayInt(value.retainedCustomersFromStartAtEnd)}
            </span>
          </label>
        ) : (
          <label className="flex flex-col gap-1">
            Churned customers per period
            <input
              type="number"
              name="churnedCustomersPerPeriod"
              value={value.churnedCustomersPerPeriod ?? ""}
              onChange={handleChange}
              className="rounded border border-white/30 bg-black p-2 text-white"
            />
            <span className="text-sm text-white/70">
              Use this if you track churn directly instead of retained cohort counts.
            </span>
            <span className="text-xs text-white/60">
              Formatted: {displayInt(value.churnedCustomersPerPeriod)}
            </span>
          </label>
        )}

        <p className="text-sm text-white/70">
          Subscription end customers are derived as start customers + new customers - churned customers when a starting customer base is provided.
        </p>
        <p className="text-sm text-white/70">
          For single-unit economics, set revenue to the subscription price, use sales velocity for subscriptions sold in the period, and use direct CAC, delivery costs, or direct churn rate if those are easier to estimate than top-down totals.
        </p>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded border border-white/60 px-4 py-2 text-white disabled:opacity-50"
            disabled={isCalculating}
          >
            {isCalculating ? "Calculating..." : "Calculate Offer KPIs"}
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
  inputs: OfferInput;
  usd: Intl.NumberFormat;
  intFormatter: Intl.NumberFormat;
}) => {
  const pct = (value: number | null) =>
    value == null ? "-" : `${(value * 100).toFixed(2)}%`;

  const ratioX = (value: number | null) =>
    value == null ? "-" : `${value.toFixed(2)}x`;

  const formatMoney = (value: number | null) =>
    value == null ? "-" : usd.format(value);

  const formatInt = (value: number | null) =>
    value == null ? "-" : intFormatter.format(value);

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
        ? "-"
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
  inputs: OfferInput;
  intFormatter: Intl.NumberFormat;
}) => {
  const start = inputs.activeCustomersStart ?? null;
  const newCustomers = inputs.newCustomersPerPeriod ?? null;
  const derivedChurned =
    inputs.churnedCustomersPerPeriod != null
      ? inputs.churnedCustomersPerPeriod
      : inputs.retainedCustomersFromStartAtEnd != null &&
          inputs.activeCustomersStart != null
        ? inputs.activeCustomersStart - inputs.retainedCustomersFromStartAtEnd
        : inputs.directChurnRatePerPeriod != null && start != null
          ? start * inputs.directChurnRatePerPeriod
        : null;
  const derivedEnd =
    start != null && newCustomers != null && derivedChurned != null
      ? start + newCustomers - derivedChurned
      : null;

  const formatInt = (value: number | null) =>
    value == null ? "-" : intFormatter.format(value);

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
      {start == null ? (
        <p className="mt-2 text-xs text-white/70">
          Customer bridge is optional in direct price + direct churn mode. Add a starting customer base if you want cohort movement shown here.
        </p>
      ) : derivedChurned == null ? (
        <p className="mt-2 text-xs text-white/70">
          Provide churned or retained-from-start customers to unlock the customer bridge.
        </p>
      ) : null}
    </div>
  );
};
