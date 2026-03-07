"use client";

import { useMemo } from "react";
import type { OfferInput, KPIResult } from "@/features/kpi/types";
import type { KpiInputPanelProps } from "./types";
import { parsePercentInput, percentInputValue, percentText } from "./percent";

const offerTypeOptions = [
  { value: "subscription", label: "Subscription Offer", enabled: true },
  { value: "one_time", label: "One-Time Offer", enabled: false },
  { value: "installment", label: "Installment Offer", enabled: false },
  { value: "usage_based", label: "Usage-Based Offer", enabled: false },
  { value: "service_retainer", label: "Service Retainer", enabled: false },
] as const;

type NumericFieldName = "newCustomersPerPeriod";
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
  const calculatorMode = value.calculatorMode ?? "business_metrics";
  const churnInputMode =
    value.churnedCustomersPerPeriod != null && value.retainedCustomersFromStartAtEnd == null
      ? "churned"
      : "retained";
  const grossProfitInputMode = value.grossProfitInputMode ?? "margin";
  const showActiveCustomersStart = calculatorMode === "business_metrics";

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
        name === "revenueInputMode" ||
        name === "calculatorMode"
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
      if (name === "grossMargin" || name === "directChurnRatePerPeriod") {
        return parsePercentInput(nextValue);
      }
      return numeric;
    };

    onChange({
      ...value,
      [name]: parseValue(),
    });
  };

  const setCalculatorMode = (mode: "unit_economics" | "business_metrics") => {
    if (mode === "unit_economics") {
      onChange({
        ...value,
        calculatorMode: mode,
        revenueInputMode: "direct_arpc",
        cacInputMode: "direct",
        retentionInputMode: "rate",
      });
      return;
    }

    onChange({
      ...value,
      calculatorMode: mode,
      revenueInputMode: "total_revenue",
      cacInputMode: "derived",
      retentionInputMode: "counts",
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
        calculatorMode === "unit_economics"
          ? `Sales Velocity / New Customers (per ${periodLabel})`
          : `New Customers (per ${periodLabel})`,
      name: "newCustomersPerPeriod" as const,
      formatted: displayInt(value.newCustomersPerPeriod),
    },
  ];

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
          <p className="font-medium">Calculator mode</p>
          <p className="mt-1 text-sm text-white/70">
            `Unit economics` is for modeling one offer from price, churn, CAC, and delivery cost. `Business metrics` is for modeling the business from revenue, spend, and customer counts.
          </p>
          <div className="mt-3 space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="calculatorMode"
                value="unit_economics"
                checked={calculatorMode === "unit_economics"}
                onChange={() => setCalculatorMode("unit_economics")}
              />
              <span>Unit economics</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="calculatorMode"
                value="business_metrics"
                checked={calculatorMode === "business_metrics"}
                onChange={() => setCalculatorMode("business_metrics")}
              />
              <span>Business metrics</span>
            </label>
          </div>
        </div>

        {calculatorMode === "business_metrics" ? (
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
          <p className="font-medium">Gross profit input</p>
          <p className="mt-1 text-sm text-white/70">
            Use gross margin if you know the margin percentage. Use delivery costs if you know the cost to serve each subscription.
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
              <span>Use delivery costs</span>
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

        {calculatorMode === "business_metrics" ? (
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

        {calculatorMode === "business_metrics" && (
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

        {calculatorMode === "unit_economics" ? (
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
    | "hypotheticalMaxCustomers"
    | "hypotheticalMaxRevenuePerYear"
    | "hypotheticalMaxProfitPerYear"
    | "projectedRevenueNextYear"
    | "projectedProfitNextYear"
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
    hypotheticalMaxCustomers: () => formatInt(results.hypotheticalMaxCustomers),
    hypotheticalMaxRevenuePerYear: () =>
      formatMoney(results.hypotheticalMaxRevenuePerYear),
    hypotheticalMaxProfitPerYear: () =>
      formatMoney(results.hypotheticalMaxProfitPerYear),
    projectedRevenueNextYear: () =>
      formatMoney(results.projectedRevenueNextYear),
    projectedProfitNextYear: () =>
      formatMoney(results.projectedProfitNextYear),
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
    hypotheticalMaxCustomers: "Hypothetical max customers",
    hypotheticalMaxRevenuePerYear: "Hypothetical max revenue per year",
    hypotheticalMaxProfitPerYear: "Hypothetical max profit per year",
    projectedRevenueNextYear: "Projected revenue over next year",
    projectedProfitNextYear: "Projected profit over next year",
    car: "Sales velocity / new customers per period",
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
    "hypotheticalMaxCustomers",
    "hypotheticalMaxRevenuePerYear",
    "hypotheticalMaxProfitPerYear",
    "projectedRevenueNextYear",
    "projectedProfitNextYear",
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
