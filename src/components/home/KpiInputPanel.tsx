"use client";

import { useMemo } from "react";
import type { KPIResult, SubscriptionOfferInput } from "@/features/kpi/types";
import type { KpiInputPanelProps } from "./types";
import { parsePercentInput, percentInputValue, percentText } from "./percent";

const offerTypeOptions = [
  { value: "software_subscription", label: "Software Subscription", enabled: true },
  {
    value: "subscription",
    label: "Legacy Subscription (compatibility)",
    enabled: true,
  },
  { value: "software_paid_pilot", label: "Paid Pilot", enabled: false },
  {
    value: "software_pilot_to_subscription",
    label: "Pilot to Subscription",
    enabled: false,
  },
  { value: "software_token_pricing", label: "Token-Priced AI", enabled: false },
  {
    value: "software_hybrid_platform_usage",
    label: "Platform + Usage Hybrid",
    enabled: false,
  },
  {
    value: "software_implementation_plus_subscription",
    label: "Implementation + Subscription",
    enabled: false,
  },
] as const;

const defaultSoftwareConfig = {
  industryPreset: "software_tech" as const,
  monetizationModel: "subscription_seat_based" as const,
  revenueComponents: [
    {
      componentType: "platform_subscription" as const,
      label: "Core platform subscription",
      pricingMetric: "workspace" as const,
    },
  ],
  goToMarketMotion: "sales_led" as const,
};

type NumericFieldName = "newCustomersPerPeriod";
type NumericField = {
  label: string;
  name: NumericFieldName;
  formatted: string;
  step?: string;
};

const ChoiceCard = ({
  checked,
  title,
  description,
  onSelect,
}: {
  checked: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) => {
  return (
    <button
      type="button"
      data-selected={checked}
      onClick={onSelect}
      className="choice-card flex w-full items-start gap-3 rounded-[18px] p-3 text-left"
    >
      <span className="choice-indicator mt-1 h-3.5 w-3.5 rounded-full" />
      <span className="space-y-1">
        <span className="block text-sm font-medium text-white">{title}</span>
        <span className="block text-xs text-white/54">{description}</span>
      </span>
    </button>
  );
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
    value.churnedCustomersPerPeriod != null &&
    value.retainedCustomersFromStartAtEnd == null
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
  const displayInt = (val?: number) =>
    val == null ? "-" : intFormatter.format(val);
  const fieldClass = "input-shell rounded-[16px] px-3 py-2";
  const panelClass = "panel-subtle rounded-[22px] p-4";
  const labelClass = "text-[13px] font-medium tracking-[0.01em] text-white/82";
  const helperClass = "text-xs text-white/54";

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

    if (name === "offerType") {
      const offerType = parseValue() as SubscriptionOfferInput["offerType"];
      onChange({
        ...value,
        offerType,
        softwareConfig:
          offerType === "software_subscription"
            ? value.softwareConfig ?? defaultSoftwareConfig
            : value.softwareConfig,
      });
      return;
    }

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
      name: "newCustomersPerPeriod",
      formatted: displayInt(value.newCustomersPerPeriod),
    },
  ];

  return (
    <section className="panel-shell rounded-[26px] p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Offer Inputs</h2>
          <p className="text-sm text-white/62">
            Model one software/tech offer at a time. Start with sales velocity,
            churn, CAC, and gross profit. Use unit economics or business
            metrics for the same subscription.
          </p>
        </div>
        {children}
      </div>

      <form className="mt-4 flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Offer name</span>
            <input
              type="text"
              name="offerName"
              value={value.offerName}
              onChange={handleChange}
              className={fieldClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Offer ID</span>
            <input
              type="text"
              name="offerId"
              value={value.offerId}
              onChange={handleChange}
              className={fieldClass}
            />
            <span className={helperClass}>
              Stable key for this offer in saved reports.
            </span>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Offer type</span>
          <select
            name="offerType"
            value={value.offerType}
            onChange={handleChange}
            className={fieldClass}
          >
            {offerTypeOptions.map((option) => (
              <option key={option.value} value={option.value} disabled={!option.enabled}>
                {option.label}
                {!option.enabled ? " (coming next)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Analysis period</span>
          <select
            name="analysisPeriod"
            value={value.analysisPeriod}
            onChange={handleChange}
            className={fieldClass}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>

        <div className={`${panelClass} text-sm text-white/74`}>
          <p className="font-medium">Start With Four Core Levers</p>
          <p className="mt-1">
            Keep this simple: sales velocity, churn, gross profit per customer,
            and acquisition cost.
          </p>
        </div>

        <div className={panelClass}>
          <p className="font-medium">Calculator mode</p>
          <p className="mt-1 text-sm text-white/58">
            `Unit economics` is for modeling one software offer from price,
            churn, CAC, and delivery cost. `Business metrics` is for modeling
            the business from revenue, spend, and customer counts.
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <ChoiceCard
              checked={calculatorMode === "unit_economics"}
              title="Unit economics"
              description="Model one offer from price, churn, CAC, and delivery cost."
              onSelect={() => setCalculatorMode("unit_economics")}
            />
            <ChoiceCard
              checked={calculatorMode === "business_metrics"}
              title="Business metrics"
              description="Model from revenue, acquisition spend, and customer counts."
              onSelect={() => setCalculatorMode("business_metrics")}
            />
          </div>
        </div>

        {calculatorMode === "business_metrics" ? (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>
              Current Revenue Run Rate (per {periodLabel})
            </span>
            <input
              type="number"
              name="revenuePerPeriod"
              value={value.revenuePerPeriod ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
            <span className={helperClass}>
              Formatted: {displayMoney(value.revenuePerPeriod)}
            </span>
          </label>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>
              Subscription price / ARPC (per {periodLabel})
            </span>
            <input
              type="number"
              name="directArpc"
              value={value.directArpc ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
            <span className={helperClass}>
              Example: enter 3000 for one $3,000/month subscription.
            </span>
            <span className={helperClass}>
              Formatted: {displayMoney(value.directArpc)}
            </span>
          </label>
        )}

        {numericFields.map((field) => (
          <label key={field.name} className="flex flex-col gap-1.5">
            <span className={labelClass}>{field.label}</span>
            <input
              type="number"
              name={field.name}
              value={value[field.name] ?? ""}
              step={field.step}
              onChange={handleChange}
              className={fieldClass}
            />
            <span className={helperClass}>Formatted: {field.formatted}</span>
          </label>
        ))}

        {showActiveCustomersStart && (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Starting Customer Base</span>
            <input
              type="number"
              name="activeCustomersStart"
              value={value.activeCustomersStart ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
            <span className={helperClass}>
              Required for cohort-count churn and for deriving ARPC from total
              revenue.
            </span>
            <span className={helperClass}>
              Formatted: {displayInt(value.activeCustomersStart)}
            </span>
          </label>
        )}

        <div className={panelClass}>
          <p className="font-medium">Gross profit input</p>
          <p className="mt-1 text-sm text-white/58">
            Use gross margin if you know the margin percentage. Use delivery
            costs if you know the cost to serve each subscription.
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <ChoiceCard
              checked={grossProfitInputMode === "margin"}
              title="Use gross margin %"
              description="Best when you already know the gross margin profile."
              onSelect={() => setGrossProfitMode("margin")}
            />
            <ChoiceCard
              checked={grossProfitInputMode === "costs"}
              title="Use delivery costs"
              description="Best when cost to serve is easier than margin %."
              onSelect={() => setGrossProfitMode("costs")}
            />
          </div>
        </div>

        {grossProfitInputMode === "margin" ? (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Gross Margin (%)</span>
            <input
              type="number"
              name="grossMargin"
              value={percentInputValue(value.grossMargin)}
              step="0.1"
              onChange={handleChange}
              className={fieldClass}
            />
            <span className={helperClass}>
              Before acquisition cost. Example: 70 = 70%.
            </span>
            <span className={helperClass}>
              Formatted: {percentText(value.grossMargin)}
            </span>
            {grossMarginError && (
              <span className="text-sm text-white/66">{grossMarginError}</span>
            )}
          </label>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className={labelClass}>
                Delivery cost per active customer (per {periodLabel})
              </span>
              <input
                type="number"
                name="deliveryCostPerCustomerPerPeriod"
                value={value.deliveryCostPerCustomerPerPeriod ?? ""}
                onChange={handleChange}
                className={fieldClass}
              />
              <span className={helperClass}>
                Example: monthly AI token cost, fulfillment, or support cost per
                active subscription.
              </span>
              <span className={helperClass}>
                Formatted: {displayMoney(value.deliveryCostPerCustomerPerPeriod)}
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>
                Fixed delivery cost (optional, per {periodLabel})
              </span>
              <input
                type="number"
                name="fixedDeliveryCostPerPeriod"
                value={value.fixedDeliveryCostPerPeriod ?? ""}
                onChange={handleChange}
                className={fieldClass}
              />
              <span className={helperClass}>
                Shared infrastructure or software cost allocated across active
                customers.
              </span>
              <span className={helperClass}>
                Formatted: {displayMoney(value.fixedDeliveryCostPerPeriod)}
              </span>
            </label>
          </div>
        )}

        {calculatorMode === "business_metrics" ? (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>
              Customer Acquisition Spend (per {periodLabel})
            </span>
            <input
              type="number"
              name="marketingSpendPerPeriod"
              value={value.marketingSpendPerPeriod ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
            <span className={helperClass}>
              Formatted: {displayMoney(value.marketingSpendPerPeriod)}
            </span>
          </label>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Direct CAC</span>
            <input
              type="number"
              name="directCac"
              value={value.directCac ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
            <span className={helperClass}>
              Use this if you already know customer acquisition cost and do not
              want to back it out from spend.
            </span>
            <span className={helperClass}>
              Formatted: {displayMoney(value.directCac)}
            </span>
          </label>
        )}

        {calculatorMode === "business_metrics" && (
          <div className={`${panelClass} space-y-3`}>
            <p className="font-medium">
              How do you want to input churn from the starting cohort?
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              <ChoiceCard
                checked={churnInputMode === "retained"}
                title="I know how many starting customers remained"
                description="Use retained cohort counts from the opening customer base."
                onSelect={() => setChurnMode("retained")}
              />
              <ChoiceCard
                checked={churnInputMode === "churned"}
                title="I know how many starting customers churned"
                description="Use direct churn counts for the same cohort."
                onSelect={() => setChurnMode("churned")}
              />
            </div>
          </div>
        )}

        {calculatorMode === "unit_economics" ? (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Churn rate per {periodLabel} (%)</span>
            <input
              type="number"
              name="directChurnRatePerPeriod"
              value={percentInputValue(value.directChurnRatePerPeriod)}
              step="0.1"
              onChange={handleChange}
              className={fieldClass}
            />
            <span className={helperClass}>
              Example: enter 10 for a 10% monthly churn rate.
            </span>
            <span className={helperClass}>
              Formatted: {percentText(value.directChurnRatePerPeriod)}
            </span>
          </label>
        ) : churnInputMode === "retained" ? (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Customers from start still active at end</span>
            <input
              type="number"
              name="retainedCustomersFromStartAtEnd"
              value={value.retainedCustomersFromStartAtEnd ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
            <span className={helperClass}>
              Cohort retention only for the customers you had at the start of
              the period.
            </span>
            <span className={helperClass}>
              Formatted: {displayInt(value.retainedCustomersFromStartAtEnd)}
            </span>
          </label>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Churned customers per period</span>
            <input
              type="number"
              name="churnedCustomersPerPeriod"
              value={value.churnedCustomersPerPeriod ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
            <span className={helperClass}>
              Use this if you track churn directly instead of retained cohort
              counts.
            </span>
            <span className={helperClass}>
              Formatted: {displayInt(value.churnedCustomersPerPeriod)}
            </span>
          </label>
        )}

        <p className="text-sm text-white/58">
          Subscription end customers are derived as start customers + new
          customers - churned customers when a starting customer base is
          provided.
        </p>
        <p className="text-sm text-white/58">
          For single-unit economics, set revenue to the subscription price, use
          sales velocity for subscriptions sold in the period, and use direct
          CAC, delivery costs, or direct churn rate if those are easier to
          estimate than top-down totals.
        </p>

        <div className="flex gap-3">
          <button
            type="submit"
            className="pill-action rounded-full px-4 py-2 disabled:opacity-50 disabled:hover:border-white/15 disabled:hover:bg-white/[0.018] disabled:hover:text-white"
            disabled={isCalculating}
          >
            {isCalculating ? "Calculating..." : "Calculate Offer KPIs"}
          </button>
        </div>
      </form>

      {warnings.length > 0 && (
        <div className={`${panelClass} mt-4 text-sm text-white/74`}>
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
  inputs: SubscriptionOfferInput;
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
    projectedRevenueNextYear: () => formatMoney(results.projectedRevenueNextYear),
    projectedProfitNextYear: () => formatMoney(results.projectedProfitNextYear),
    car: () => `${formatInt(results.car)} per period`,
  };

  const labelMap: Record<ResultKey, string> = {
    cac: "Customer acquisition cost (CAC)",
    arpc: "Average revenue per customer (ARPC)",
    churnRate: "Churn rate",
    retentionRate: "Retention rate",
    ltv: "Lifetime value (LTV)",
    ltgpPerCustomer: "Lifetime gross profit per customer (LTGP)",
    ltgpToCacRatio: "LTGP:CAC (core growth ratio)",
    cacPaybackPeriods: "CAC payback",
    hypotheticalMaxCustomers: "Hypothetical max customers",
    hypotheticalMaxRevenuePerYear: "Hypothetical max revenue / year",
    hypotheticalMaxProfitPerYear: "Hypothetical max profit / year",
    projectedRevenueNextYear: "Projected revenue over next year",
    projectedProfitNextYear: "Projected profit over next year",
    car: "Sales velocity / new customers per period",
  };

  const orderedKeys: ResultKey[] = [
    "ltgpToCacRatio",
    "cacPaybackPeriods",
    "car",
    "churnRate",
    "cac",
    "arpc",
    "retentionRate",
    "ltv",
    "ltgpPerCustomer",
    "hypotheticalMaxCustomers",
    "hypotheticalMaxRevenuePerYear",
    "hypotheticalMaxProfitPerYear",
    "projectedRevenueNextYear",
    "projectedProfitNextYear",
  ];

  return (
    <div className="panel-subtle mt-4 space-y-4 rounded-[22px] p-5 text-white">
      <h2 className="font-semibold">Results</h2>
      <p className="text-sm text-white/58">
        Core growth math comes first: LTGP:CAC, payback, sales velocity, and
        churn. Steady-state ceiling and next-year projection metrics follow.
      </p>
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
  inputs: SubscriptionOfferInput;
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
    <div className="panel-subtle rounded-[20px] p-4 text-sm text-white">
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
        <p className="mt-2 text-xs text-white/56">
          Customer bridge is optional in direct price + direct churn mode. Add a
          starting customer base if you want cohort movement shown here.
        </p>
      ) : derivedChurned == null ? (
        <p className="mt-2 text-xs text-white/56">
          Provide churned or retained-from-start customers to unlock the
          customer bridge.
        </p>
      ) : null}
    </div>
  );
};
