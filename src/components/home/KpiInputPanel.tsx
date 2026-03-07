"use client";

import { useMemo } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { SubscriptionOfferInput } from "@/features/kpi/types";
import type { KpiInputPanelProps } from "./types";
import { parsePercentInput, percentInputValue, percentText } from "./percent";
import OfferModeSwitch from "./OfferModeSwitch";
import OfferTypePills from "./OfferTypePills";
import {
  ChoiceCard,
  FieldBlock,
  SelectField,
  fieldClassName,
  panelClassName,
  pillClassName,
} from "./form-primitives";

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

const KpiInputPanel = ({
  value,
  onChange,
  onCalculate,
  isCalculating,
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
  const fieldClass = fieldClassName;
  const panelClass = panelClassName;

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value: nextValue } = event.target;
    const parseValue = () => {
      if (
        name === "analysisPeriod" ||
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

  const setOfferType = (offerType: SubscriptionOfferInput["offerType"]) => {
    onChange({
      ...value,
      offerType,
      softwareConfig:
        offerType === "software_subscription"
          ? value.softwareConfig ?? defaultSoftwareConfig
          : value.softwareConfig,
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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
      <form className="flex flex-col gap-4 text-white" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FieldBlock label="Offer name">
            <input
              type="text"
              name="offerName"
              value={value.offerName}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>

          <FieldBlock
            label="Offer ID"
            helper="Stable key for this offer in saved reports."
          >
            <input
              type="text"
              name="offerId"
              value={value.offerId}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        </div>

        <OfferTypePills value={value.offerType} onChange={setOfferType} />

        <FieldBlock label="Analysis period">
          <SelectField
            name="analysisPeriod"
            value={value.analysisPeriod}
            onChange={handleChange}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </SelectField>
        </FieldBlock>

        <div className={`${panelClass} text-sm text-white/74`}>
          <p className="font-medium">Start With Four Core Levers</p>
          <p className="mt-1">
            Keep this simple: sales velocity, churn, gross profit per customer,
            and acquisition cost.
          </p>
        </div>

        <OfferModeSwitch value={calculatorMode} onChange={setCalculatorMode} />

        {calculatorMode === "business_metrics" ? (
          <FieldBlock
            label={`Current Revenue Run Rate (per ${periodLabel})`}
            helper={`Formatted: ${displayMoney(value.revenuePerPeriod)}`}
          >
            <input
              type="number"
              name="revenuePerPeriod"
              value={value.revenuePerPeriod ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        ) : (
          <FieldBlock
            label={`Subscription price / ARPC (per ${periodLabel})`}
            helper={
              <>
                <span>Example: enter 3000 for one $3,000/month subscription.</span>
                <br />
                <span>Formatted: {displayMoney(value.directArpc)}</span>
              </>
            }
          >
            <input
              type="number"
              name="directArpc"
              value={value.directArpc ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        )}

        {numericFields.map((field) => (
          <FieldBlock
            key={field.name}
            label={field.label}
            helper={`Formatted: ${field.formatted}`}
          >
            <input
              type="number"
              name={field.name}
              value={value[field.name] ?? ""}
              step={field.step}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        ))}

        {showActiveCustomersStart && (
          <FieldBlock
            label="Starting Customer Base"
            helper={
              <>
                <span>
                  Required for cohort-count churn and for deriving ARPC from total
                  revenue.
                </span>
                <br />
                <span>Formatted: {displayInt(value.activeCustomersStart)}</span>
              </>
            }
          >
            <input
              type="number"
              name="activeCustomersStart"
              value={value.activeCustomersStart ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
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
          <FieldBlock
            label="Gross Margin (%)"
            helper={
              <>
                <span>Before acquisition cost. Example: 70 = 70%.</span>
                <br />
                <span>Formatted: {percentText(value.grossMargin)}</span>
              </>
            }
          >
            <input
              type="number"
              name="grossMargin"
              value={percentInputValue(value.grossMargin)}
              step="0.1"
              onChange={handleChange}
              className={fieldClass}
            />
            {grossMarginError && (
              <span className="text-sm text-white/66">{grossMarginError}</span>
            )}
          </FieldBlock>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <FieldBlock
              label={`Delivery cost per active customer (per ${periodLabel})`}
              helper={
                <>
                  <span>
                    Example: monthly AI token cost, fulfillment, or support cost per
                    active subscription.
                  </span>
                  <br />
                  <span>
                    Formatted: {displayMoney(value.deliveryCostPerCustomerPerPeriod)}
                  </span>
                </>
              }
            >
              <input
                type="number"
                name="deliveryCostPerCustomerPerPeriod"
                value={value.deliveryCostPerCustomerPerPeriod ?? ""}
                onChange={handleChange}
                className={fieldClass}
              />
            </FieldBlock>

            <FieldBlock
              label={`Fixed delivery cost (optional, per ${periodLabel})`}
              helper={
                <>
                  <span>
                    Shared infrastructure or software cost allocated across active
                    customers.
                  </span>
                  <br />
                  <span>Formatted: {displayMoney(value.fixedDeliveryCostPerPeriod)}</span>
                </>
              }
            >
              <input
                type="number"
                name="fixedDeliveryCostPerPeriod"
                value={value.fixedDeliveryCostPerPeriod ?? ""}
                onChange={handleChange}
                className={fieldClass}
              />
            </FieldBlock>
          </div>
        )}

        {calculatorMode === "business_metrics" ? (
          <FieldBlock
            label={`Customer Acquisition Spend (per ${periodLabel})`}
            helper={`Formatted: ${displayMoney(value.marketingSpendPerPeriod)}`}
          >
            <input
              type="number"
              name="marketingSpendPerPeriod"
              value={value.marketingSpendPerPeriod ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        ) : (
          <FieldBlock
            label="Direct CAC"
            helper={
              <>
                <span>
                  Use this if you already know customer acquisition cost and do not
                  want to back it out from spend.
                </span>
                <br />
                <span>Formatted: {displayMoney(value.directCac)}</span>
              </>
            }
          >
            <input
              type="number"
              name="directCac"
              value={value.directCac ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
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
          <FieldBlock
            label={`Churn rate per ${periodLabel} (%)`}
            helper={
              <>
                <span>Example: enter 10 for a 10% monthly churn rate.</span>
                <br />
                <span>Formatted: {percentText(value.directChurnRatePerPeriod)}</span>
              </>
            }
          >
            <input
              type="number"
              name="directChurnRatePerPeriod"
              value={percentInputValue(value.directChurnRatePerPeriod)}
              step="0.1"
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        ) : churnInputMode === "retained" ? (
          <FieldBlock
            label="Customers from start still active at end"
            helper={
              <>
                <span>
                  Cohort retention only for the customers you had at the start of
                  the period.
                </span>
                <br />
                <span>Formatted: {displayInt(value.retainedCustomersFromStartAtEnd)}</span>
              </>
            }
          >
            <input
              type="number"
              name="retainedCustomersFromStartAtEnd"
              value={value.retainedCustomersFromStartAtEnd ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        ) : (
          <FieldBlock
            label="Churned customers per period"
            helper={
              <>
                <span>
                  Use this if you track churn directly instead of retained cohort
                  counts.
                </span>
                <br />
                <span>Formatted: {displayInt(value.churnedCustomersPerPeriod)}</span>
              </>
            }
          >
            <input
              type="number"
              name="churnedCustomersPerPeriod"
              value={value.churnedCustomersPerPeriod ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
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
            className={`${pillClassName} px-4 py-2 disabled:opacity-50 disabled:hover:border-white/15 disabled:hover:bg-white/[0.018] disabled:hover:text-white`}
            disabled={isCalculating}
          >
            {isCalculating ? "Calculating..." : "Calculate Offer KPIs"}
          </button>
        </div>
      </form>
  );
};

export default KpiInputPanel;
