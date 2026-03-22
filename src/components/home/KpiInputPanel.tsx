"use client";

import { useMemo } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type {
  EcommerceOneTimeProductInput,
  EcommerceRepeatPurchaseProductInput,
  EcommerceSubscriptionReplenishmentInput,
  GrossProfitInputMode,
  RetentionInputMode,
  SoftwareHybridPlatformUsageInput,
  SoftwareImplementationPlusSubscriptionInput,
  SoftwarePaidPilotInput,
  SoftwareTokenPricingInput,
  SubscriptionOfferInput,
} from "@/features/kpi/types";
import type {
  KpiInputPanelProps,
  KPIInputState,
  SupportedIndustry,
  SupportedOfferType,
} from "./types";
import {
  ChoiceCard,
  FieldBlock,
  SelectField,
  fieldClassName,
  panelClassName,
  pillClassName,
} from "./form-primitives";
import { parsePercentInput, percentInputValue, percentText } from "./percent";
import OfferModeSwitch from "./OfferModeSwitch";
import OfferTypePills from "./OfferTypePills";
import {
  createDefaultOfferInput,
  defaultOfferTypeByIndustry,
  getIndustryFromOffer,
} from "./types";

const KpiInputPanel = ({
  value,
  onChange,
  onCalculate,
  isCalculating,
}: KpiInputPanelProps) => {
  const fieldClass = fieldClassName;
  const panelClass = panelClassName;
  const periodLabel = `${value.analysisPeriod} period`;
  const isSubscription = value.offerType === "software_subscription";
  const isPaidPilot = value.offerType === "software_paid_pilot";
  const isTokenPricing = value.offerType === "software_token_pricing";
  const isHybrid = value.offerType === "software_hybrid_platform_usage";
  const isImplementation =
    value.offerType === "software_implementation_plus_subscription";
  const isEcommerceOneTime = value.offerType === "ecommerce_one_time_product";
  const isEcommerceRepeat =
    value.offerType === "ecommerce_repeat_purchase_product";
  const isEcommerceReplenishment =
    value.offerType === "ecommerce_subscription_replenishment";
  const activeIndustry = getIndustryFromOffer(value);
  const calculatorMode =
    isSubscription ? value.calculatorMode ?? "business_metrics" : null;
  const cacInputMode = value.cacInputMode ?? "derived";
  const usd = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
    [],
  );
  const intFormatter = useMemo(
    () => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }),
    [],
  );

  const displayMoney = (val?: number) => (val == null ? "-" : usd.format(val));
  const displayInt = (val?: number) => (val == null ? "-" : intFormatter.format(val));

  const setValue = (patch: Partial<KPIInputState>) => {
    onChange({ ...value, ...patch } as KPIInputState);
  };

  const preserveScrollDuring = (work: () => void) => {
    if (typeof window === "undefined") {
      work();
      return;
    }

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    work();

    requestAnimationFrame(() => {
      window.scrollTo(scrollX, scrollY);
      requestAnimationFrame(() => {
        window.scrollTo(scrollX, scrollY);
      });
    });
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value: nextValue } = event.target;
    const stringFields = new Set(["analysisPeriod", "offerName", "offerId", "calculatorMode"]);
    if (stringFields.has(name)) {
      setValue({ [name]: nextValue } as Partial<KPIInputState>);
      return;
    }
    if (nextValue === "") {
      setValue({ [name]: undefined } as Partial<KPIInputState>);
      return;
    }
    if (
      name === "grossMargin" ||
      name === "directChurnRatePerPeriod" ||
      name === "pilotGrossMargin" ||
      name === "implementationGrossMargin" ||
      name === "refundsRatePerOrder" ||
      name === "refundsRatePerPeriod"
    ) {
      setValue({ [name]: parsePercentInput(nextValue) } as Partial<KPIInputState>);
      return;
    }
    const numeric = Number(nextValue);
    if (!Number.isNaN(numeric)) {
      setValue({ [name]: numeric } as Partial<KPIInputState>);
    }
  };

  const setOfferType = (offerType: SupportedOfferType) => {
    const next = createDefaultOfferInput(offerType);
    next.analysisPeriod = value.analysisPeriod;
    preserveScrollDuring(() => {
      onChange(next);
    });
  };

  const setIndustry = (industry: SupportedIndustry) => {
    const next = createDefaultOfferInput(defaultOfferTypeByIndustry[industry]);
    next.analysisPeriod = value.analysisPeriod;
    preserveScrollDuring(() => {
      onChange(next);
    });
  };

  const setCalculatorMode = (mode: "unit_economics" | "business_metrics") => {
    if (!isSubscription) {
      return;
    }
    if (mode === "unit_economics") {
      preserveScrollDuring(() => {
        onChange({
          ...value,
          calculatorMode: mode,
          revenueInputMode: "direct_arpc",
          cacInputMode: "direct",
          retentionInputMode: "rate",
        });
      });
      return;
    }

    preserveScrollDuring(() => {
      onChange({
        ...value,
        calculatorMode: mode,
        revenueInputMode: "total_revenue",
        cacInputMode: "derived",
        retentionInputMode: "counts",
      });
    });
  };

  const setSubscriptionChurnMode = (mode: "retained" | "churned") => {
    if (!isSubscription) {
      return;
    }
    if (mode === "retained") {
      preserveScrollDuring(() => {
        onChange({
          ...value,
          churnedCustomersPerPeriod: undefined,
        });
      });
      return;
    }
    preserveScrollDuring(() => {
      onChange({
        ...value,
        retainedCustomersFromStartAtEnd: undefined,
      });
    });
  };

  const setRecurringGrossProfitMode = (mode: GrossProfitInputMode) => {
    if (!isSubscription && !isImplementation) {
      return;
    }
    preserveScrollDuring(() => {
      setValue({
        grossProfitInputMode: mode,
        grossMargin:
          mode === "margin" && "grossMargin" in value ? value.grossMargin : undefined,
        deliveryCostPerCustomerPerPeriod:
          mode === "costs" && "deliveryCostPerCustomerPerPeriod" in value
            ? value.deliveryCostPerCustomerPerPeriod
            : undefined,
        fixedDeliveryCostPerPeriod:
          mode === "costs" && "fixedDeliveryCostPerPeriod" in value
            ? value.fixedDeliveryCostPerPeriod
            : undefined,
      });
    });
  };

  const setCacMode = (mode: "derived" | "direct") => {
    preserveScrollDuring(() => {
      setValue({
        cacInputMode: mode,
        marketingSpendPerPeriod:
          mode === "derived" && "marketingSpendPerPeriod" in value
            ? value.marketingSpendPerPeriod
            : undefined,
        directCac:
          mode === "direct" && "directCac" in value ? value.directCac : undefined,
      });
    });
  };

  const setRecurringRetentionMode = (mode: RetentionInputMode) => {
    if (!isTokenPricing && !isHybrid && !isImplementation && !isEcommerceReplenishment) {
      return;
    }
    preserveScrollDuring(() => {
      setValue({
        retentionInputMode: mode,
        directChurnRatePerPeriod:
          mode === "rate" && "directChurnRatePerPeriod" in value
            ? value.directChurnRatePerPeriod
            : undefined,
        retainedCustomersFromStartAtEnd:
          mode === "counts" && "retainedCustomersFromStartAtEnd" in value
            ? value.retainedCustomersFromStartAtEnd
            : undefined,
        churnedCustomersPerPeriod:
          mode === "counts" && "churnedCustomersPerPeriod" in value
            ? value.churnedCustomersPerPeriod
            : undefined,
      });
    });
  };

  const setImplementationProfitMode = (mode: "margin" | "costs") => {
    if (!isImplementation) {
      return;
    }
    if (mode === "margin") {
      preserveScrollDuring(() => {
        onChange({
          ...value,
          implementationDeliveryCostPerNewCustomer: undefined,
        });
      });
      return;
    }
    preserveScrollDuring(() => {
      onChange({
        ...value,
        implementationGrossMargin: undefined,
      });
    });
  };

  const setPilotProfitMode = (mode: "margin" | "costs") => {
    if (!isPaidPilot) {
      return;
    }
    if (mode === "margin") {
      preserveScrollDuring(() => {
        onChange({
          ...value,
          pilotDeliveryCostPerNewCustomer: undefined,
        });
      });
      return;
    }
    preserveScrollDuring(() => {
      onChange({
        ...value,
        pilotGrossMargin: undefined,
      });
    });
  };

  const subscriptionChurnMode =
    isSubscription &&
    value.churnedCustomersPerPeriod != null &&
    value.retainedCustomersFromStartAtEnd == null
      ? "churned"
      : "retained";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void onCalculate();
  };

  const renderCacSection = () => (
    <div className={panelClass}>
      <p className="font-medium">Customer acquisition input</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <ChoiceCard
          checked={cacInputMode === "derived"}
          title="Derive from spend"
          description="Enter acquisition spend for the period and let the app derive CAC."
          onSelect={() => setCacMode("derived")}
        />
        <ChoiceCard
          checked={cacInputMode === "direct"}
          title="Use direct CAC"
          description="Best when you already know cost to acquire each new customer."
          onSelect={() => setCacMode("direct")}
        />
      </div>

      <div className="mt-4">
        {cacInputMode === "derived" ? (
          <FieldBlock
            label={`Customer acquisition spend (per ${periodLabel})`}
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
            helper={`Formatted: ${displayMoney(value.directCac)}`}
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
      </div>
    </div>
  );

  const renderRetentionSection = (
    current:
      | SoftwareTokenPricingInput
      | SoftwareHybridPlatformUsageInput
      | SoftwareImplementationPlusSubscriptionInput
      | EcommerceSubscriptionReplenishmentInput,
  ) => (
    <>
      <div className={panelClass}>
        <p className="font-medium">Retention input</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <ChoiceCard
            checked={(current.retentionInputMode ?? "counts") === "counts"}
            title="Use cohort counts"
            description="Start customers plus retained or churned cohort counts."
            onSelect={() => setRecurringRetentionMode("counts")}
          />
          <ChoiceCard
            checked={(current.retentionInputMode ?? "counts") === "rate"}
            title="Use direct churn rate"
            description="Enter churn directly when that is easier than tracking counts."
            onSelect={() => setRecurringRetentionMode("rate")}
          />
        </div>
      </div>

      <FieldBlock
        label="Starting customer base"
        helper={`Formatted: ${displayInt(current.activeCustomersStart)}`}
      >
        <input
          type="number"
          name="activeCustomersStart"
          value={current.activeCustomersStart ?? ""}
          onChange={handleChange}
          className={fieldClass}
        />
      </FieldBlock>

      {(current.retentionInputMode ?? "counts") === "rate" ? (
        <FieldBlock
          label={`Churn rate per ${periodLabel} (%)`}
          helper={`Formatted: ${percentText(current.directChurnRatePerPeriod)}`}
        >
          <input
            type="number"
            name="directChurnRatePerPeriod"
            value={percentInputValue(current.directChurnRatePerPeriod)}
            step="0.1"
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <FieldBlock
            label="Customers from start still active at end"
            helper={`Formatted: ${displayInt(current.retainedCustomersFromStartAtEnd)}`}
          >
            <input
              type="number"
              name="retainedCustomersFromStartAtEnd"
              value={current.retainedCustomersFromStartAtEnd ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>

          <FieldBlock
            label="Churned customers per period (optional)"
            helper={`Formatted: ${displayInt(current.churnedCustomersPerPeriod)}`}
          >
            <input
              type="number"
              name="churnedCustomersPerPeriod"
              value={current.churnedCustomersPerPeriod ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        </div>
      )}
    </>
  );

  const renderSubscriptionFields = (current: SubscriptionOfferInput) => (
    <>
      <div className={panelClass}>
        <p className="font-medium">Subscription model</p>
        <p className="mt-1 text-sm text-white/58">
          Keep this simple: sales velocity, churn, gross profit per customer, and
          acquisition cost.
        </p>
      </div>

      <OfferModeSwitch
        value={calculatorMode ?? "business_metrics"}
        onChange={setCalculatorMode}
      />

      {calculatorMode === "business_metrics" ? (
        <FieldBlock
          label={`Current revenue run rate (per ${periodLabel})`}
          helper={`Formatted: ${displayMoney(current.revenuePerPeriod)}`}
        >
          <input
            type="number"
            name="revenuePerPeriod"
            value={current.revenuePerPeriod ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
      ) : (
        <FieldBlock
          label={`Subscription price / ARPC (per ${periodLabel})`}
          helper={`Formatted: ${displayMoney(current.directArpc)}`}
        >
          <input
            type="number"
            name="directArpc"
            value={current.directArpc ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
      )}

      <FieldBlock
        label={
          calculatorMode === "unit_economics"
            ? `Sales velocity / new customers (per ${periodLabel})`
            : `New customers (per ${periodLabel})`
        }
        helper={`Formatted: ${displayInt(current.newCustomersPerPeriod)}`}
      >
        <input
          type="number"
          name="newCustomersPerPeriod"
          value={current.newCustomersPerPeriod ?? ""}
          onChange={handleChange}
          className={fieldClass}
        />
      </FieldBlock>

      {calculatorMode === "business_metrics" && (
        <FieldBlock
          label="Starting customer base"
          helper={`Formatted: ${displayInt(current.activeCustomersStart)}`}
        >
          <input
            type="number"
            name="activeCustomersStart"
            value={current.activeCustomersStart ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
      )}

      <div className={panelClass}>
        <p className="font-medium">Gross profit input</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <ChoiceCard
            checked={(current.grossProfitInputMode ?? "margin") === "margin"}
            title="Use gross margin %"
            description="Best when you already know the recurring margin profile."
            onSelect={() => setRecurringGrossProfitMode("margin")}
          />
          <ChoiceCard
            checked={(current.grossProfitInputMode ?? "margin") === "costs"}
            title="Use delivery costs"
            description="Best when service cost is easier than margin %."
            onSelect={() => setRecurringGrossProfitMode("costs")}
          />
        </div>
      </div>

      {(current.grossProfitInputMode ?? "margin") === "margin" ? (
        <FieldBlock
          label="Gross margin (%)"
          helper={`Formatted: ${percentText(current.grossMargin)}`}
        >
          <input
            type="number"
            name="grossMargin"
            value={percentInputValue(current.grossMargin)}
            step="0.1"
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <FieldBlock
            label={`Delivery cost per active customer (per ${periodLabel})`}
            helper={`Formatted: ${displayMoney(current.deliveryCostPerCustomerPerPeriod)}`}
          >
            <input
              type="number"
              name="deliveryCostPerCustomerPerPeriod"
              value={current.deliveryCostPerCustomerPerPeriod ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
          <FieldBlock
            label={`Fixed delivery cost (optional, per ${periodLabel})`}
            helper={`Formatted: ${displayMoney(current.fixedDeliveryCostPerPeriod)}`}
          >
            <input
              type="number"
              name="fixedDeliveryCostPerPeriod"
              value={current.fixedDeliveryCostPerPeriod ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        </div>
      )}

      {renderCacSection()}

      {calculatorMode === "unit_economics" ? (
        <FieldBlock
          label={`Churn rate per ${periodLabel} (%)`}
          helper={`Formatted: ${percentText(current.directChurnRatePerPeriod)}`}
        >
          <input
            type="number"
            name="directChurnRatePerPeriod"
            value={percentInputValue(current.directChurnRatePerPeriod)}
            step="0.1"
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
      ) : (
        <>
          <div className={panelClass}>
            <p className="font-medium">Cohort churn input</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <ChoiceCard
                checked={subscriptionChurnMode === "retained"}
                title="Use retained customers"
                description="Track how many starting customers are still active."
                onSelect={() => setSubscriptionChurnMode("retained")}
              />
              <ChoiceCard
                checked={subscriptionChurnMode === "churned"}
                title="Use churned customers"
                description="Track how many starting customers left in the period."
                onSelect={() => setSubscriptionChurnMode("churned")}
              />
            </div>
          </div>

          {subscriptionChurnMode === "retained" ? (
            <FieldBlock
              label="Customers from start still active at end"
              helper={`Formatted: ${displayInt(current.retainedCustomersFromStartAtEnd)}`}
            >
              <input
                type="number"
                name="retainedCustomersFromStartAtEnd"
                value={current.retainedCustomersFromStartAtEnd ?? ""}
                onChange={handleChange}
                className={fieldClass}
              />
            </FieldBlock>
          ) : (
            <FieldBlock
              label="Churned customers per period"
              helper={`Formatted: ${displayInt(current.churnedCustomersPerPeriod)}`}
            >
              <input
                type="number"
                name="churnedCustomersPerPeriod"
                value={current.churnedCustomersPerPeriod ?? ""}
                onChange={handleChange}
                className={fieldClass}
              />
            </FieldBlock>
          )}
        </>
      )}
    </>
  );

  const renderPaidPilotFields = (current: SoftwarePaidPilotInput) => {
    const pilotProfitMode =
      current.pilotGrossMargin != null || current.pilotDeliveryCostPerNewCustomer == null
        ? "margin"
        : "costs";
    return (
      <>
        <div className={panelClass}>
          <p className="font-medium">Paid pilot model</p>
          <p className="mt-1 text-sm text-white/58">
            Use this for a one-time pilot or proof of concept before the recurring
            contract starts.
          </p>
        </div>

        <FieldBlock
          label={`New pilots sold (per ${periodLabel})`}
          helper={`Formatted: ${displayInt(current.newCustomersPerPeriod)}`}
        >
          <input
            type="number"
            name="newCustomersPerPeriod"
            value={current.newCustomersPerPeriod ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>

        <FieldBlock
          label="Pilot fee per new customer"
          helper={`Formatted: ${displayMoney(current.pilotFeePerNewCustomer)}`}
        >
          <input
            type="number"
            name="pilotFeePerNewCustomer"
            value={current.pilotFeePerNewCustomer ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>

        <div className={panelClass}>
          <p className="font-medium">Pilot gross profit input</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <ChoiceCard
              checked={pilotProfitMode === "margin"}
              title="Use pilot gross margin %"
              description="Best when you know the pilot margin profile."
              onSelect={() => setPilotProfitMode("margin")}
            />
            <ChoiceCard
              checked={pilotProfitMode === "costs"}
              title="Use pilot delivery cost"
              description="Best when you know the cost to deliver each pilot."
              onSelect={() => setPilotProfitMode("costs")}
            />
          </div>
        </div>

        {pilotProfitMode === "margin" ? (
          <FieldBlock
            label="Pilot gross margin (%)"
            helper={`Formatted: ${percentText(current.pilotGrossMargin)}`}
          >
            <input
              type="number"
              name="pilotGrossMargin"
              value={percentInputValue(current.pilotGrossMargin)}
              step="0.1"
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        ) : (
          <FieldBlock
            label="Pilot delivery cost per new customer"
            helper={`Formatted: ${displayMoney(current.pilotDeliveryCostPerNewCustomer)}`}
          >
            <input
              type="number"
              name="pilotDeliveryCostPerNewCustomer"
              value={current.pilotDeliveryCostPerNewCustomer ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        )}

        {renderCacSection()}
      </>
    );
  };

  const renderTokenFields = (current: SoftwareTokenPricingInput) => (
    <>
      <div className={panelClass}>
        <p className="font-medium">Token usage model</p>
        <p className="mt-1 text-sm text-white/58">
          Revenue and gross profit are derived from usage per customer and token
          unit economics.
        </p>
      </div>

      <FieldBlock
        label={`New customers (per ${periodLabel})`}
        helper={`Formatted: ${displayInt(current.newCustomersPerPeriod)}`}
      >
        <input
          type="number"
          name="newCustomersPerPeriod"
          value={current.newCustomersPerPeriod ?? ""}
          onChange={handleChange}
          className={fieldClass}
        />
      </FieldBlock>

      {renderCacSection()}
      {renderRetentionSection(current)}

      <div className="grid gap-4 md:grid-cols-2">
        <FieldBlock
          label={`Usage units per customer (per ${periodLabel})`}
          helper={`Formatted: ${displayInt(current.usageUnitsPerCustomerPerPeriod)}`}
        >
          <input
            type="number"
            name="usageUnitsPerCustomerPerPeriod"
            value={current.usageUnitsPerCustomerPerPeriod ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
        <FieldBlock
          label="Price per usage unit"
          helper={`Formatted: ${displayMoney(current.pricePerUsageUnit)}`}
        >
          <input
            type="number"
            name="pricePerUsageUnit"
            value={current.pricePerUsageUnit ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldBlock
          label="Cost per usage unit"
          helper={`Formatted: ${displayMoney(current.costPerUsageUnit)}`}
        >
          <input
            type="number"
            name="costPerUsageUnit"
            value={current.costPerUsageUnit ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
        <FieldBlock
          label={`Fixed delivery cost (optional, per ${periodLabel})`}
          helper={`Formatted: ${displayMoney(current.fixedDeliveryCostPerPeriod)}`}
        >
          <input
            type="number"
            name="fixedDeliveryCostPerPeriod"
            value={current.fixedDeliveryCostPerPeriod ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
      </div>
    </>
  );

  const renderHybridFields = (current: SoftwareHybridPlatformUsageInput) => (
    <>
      <div className={panelClass}>
        <p className="font-medium">Platform + usage model</p>
        <p className="mt-1 text-sm text-white/58">
          Blend a base platform fee with usage-based revenue for each active customer.
        </p>
      </div>

      <FieldBlock
        label={`New customers (per ${periodLabel})`}
        helper={`Formatted: ${displayInt(current.newCustomersPerPeriod)}`}
      >
        <input
          type="number"
          name="newCustomersPerPeriod"
          value={current.newCustomersPerPeriod ?? ""}
          onChange={handleChange}
          className={fieldClass}
        />
      </FieldBlock>

      {renderCacSection()}
      {renderRetentionSection(current)}

      <div className="grid gap-4 md:grid-cols-2">
        <FieldBlock
          label={`Platform fee per customer (per ${periodLabel})`}
          helper={`Formatted: ${displayMoney(current.platformFeePerCustomerPerPeriod)}`}
        >
          <input
            type="number"
            name="platformFeePerCustomerPerPeriod"
            value={current.platformFeePerCustomerPerPeriod ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
        <FieldBlock
          label={`Platform delivery cost per customer (optional, per ${periodLabel})`}
          helper={`Formatted: ${displayMoney(current.platformDeliveryCostPerCustomerPerPeriod)}`}
        >
          <input
            type="number"
            name="platformDeliveryCostPerCustomerPerPeriod"
            value={current.platformDeliveryCostPerCustomerPerPeriod ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FieldBlock
          label={`Usage units per customer (per ${periodLabel})`}
          helper={`Formatted: ${displayInt(current.usageUnitsPerCustomerPerPeriod)}`}
        >
          <input
            type="number"
            name="usageUnitsPerCustomerPerPeriod"
            value={current.usageUnitsPerCustomerPerPeriod ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
        <FieldBlock
          label="Price per usage unit"
          helper={`Formatted: ${displayMoney(current.pricePerUsageUnit)}`}
        >
          <input
            type="number"
            name="pricePerUsageUnit"
            value={current.pricePerUsageUnit ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
        <FieldBlock
          label="Cost per usage unit (optional)"
          helper={`Formatted: ${displayMoney(current.costPerUsageUnit)}`}
        >
          <input
            type="number"
            name="costPerUsageUnit"
            value={current.costPerUsageUnit ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
      </div>

      <FieldBlock
        label={`Fixed delivery cost (optional, per ${periodLabel})`}
        helper={`Formatted: ${displayMoney(current.fixedDeliveryCostPerPeriod)}`}
      >
        <input
          type="number"
          name="fixedDeliveryCostPerPeriod"
          value={current.fixedDeliveryCostPerPeriod ?? ""}
          onChange={handleChange}
          className={fieldClass}
        />
      </FieldBlock>
    </>
  );

  const renderImplementationFields = (
    current: SoftwareImplementationPlusSubscriptionInput,
  ) => {
    const implementationProfitMode =
      current.implementationGrossMargin != null ||
      current.implementationDeliveryCostPerNewCustomer == null
        ? "margin"
        : "costs";
    return (
      <>
        <div className={panelClass}>
          <p className="font-medium">Implementation + recurring model</p>
          <p className="mt-1 text-sm text-white/58">
            Keep recurring subscription economics separate from the upfront
            implementation project.
          </p>
        </div>

        <FieldBlock
          label={`New customers (per ${periodLabel})`}
          helper={`Formatted: ${displayInt(current.newCustomersPerPeriod)}`}
        >
          <input
            type="number"
            name="newCustomersPerPeriod"
            value={current.newCustomersPerPeriod ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>

        {renderCacSection()}
        {renderRetentionSection(current)}

        <FieldBlock
          label={`Recurring subscription ARPC (per ${periodLabel})`}
          helper={`Formatted: ${displayMoney(current.directArpc)}`}
        >
          <input
            type="number"
            name="directArpc"
            value={current.directArpc ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>

        <div className={panelClass}>
          <p className="font-medium">Recurring subscription gross profit input</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <ChoiceCard
              checked={(current.grossProfitInputMode ?? "margin") === "margin"}
              title="Use recurring gross margin %"
              description="Best when you already know the recurring margin profile."
              onSelect={() => setRecurringGrossProfitMode("margin")}
            />
            <ChoiceCard
              checked={(current.grossProfitInputMode ?? "margin") === "costs"}
              title="Use recurring delivery costs"
              description="Best when you know the cost to serve each active account."
              onSelect={() => setRecurringGrossProfitMode("costs")}
            />
          </div>
        </div>

        {(current.grossProfitInputMode ?? "margin") === "margin" ? (
          <FieldBlock
            label="Recurring gross margin (%)"
            helper={`Formatted: ${percentText(current.grossMargin)}`}
          >
            <input
              type="number"
              name="grossMargin"
              value={percentInputValue(current.grossMargin)}
              step="0.1"
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <FieldBlock
              label={`Recurring delivery cost per active customer (per ${periodLabel})`}
              helper={`Formatted: ${displayMoney(current.deliveryCostPerCustomerPerPeriod)}`}
            >
              <input
                type="number"
                name="deliveryCostPerCustomerPerPeriod"
                value={current.deliveryCostPerCustomerPerPeriod ?? ""}
                onChange={handleChange}
                className={fieldClass}
              />
            </FieldBlock>
            <FieldBlock
              label={`Fixed delivery cost (optional, per ${periodLabel})`}
              helper={`Formatted: ${displayMoney(current.fixedDeliveryCostPerPeriod)}`}
            >
              <input
                type="number"
                name="fixedDeliveryCostPerPeriod"
                value={current.fixedDeliveryCostPerPeriod ?? ""}
                onChange={handleChange}
                className={fieldClass}
              />
            </FieldBlock>
          </div>
        )}

        <FieldBlock
          label="Implementation fee per new customer"
          helper={`Formatted: ${displayMoney(current.implementationFeePerNewCustomer)}`}
        >
          <input
            type="number"
            name="implementationFeePerNewCustomer"
            value={current.implementationFeePerNewCustomer ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>

        <div className={panelClass}>
          <p className="font-medium">Implementation gross profit input</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <ChoiceCard
              checked={implementationProfitMode === "margin"}
              title="Use implementation gross margin %"
              description="Best when the onboarding project has a known margin profile."
              onSelect={() => setImplementationProfitMode("margin")}
            />
            <ChoiceCard
              checked={implementationProfitMode === "costs"}
              title="Use implementation delivery cost"
              description="Best when you know the cost to deliver each implementation."
              onSelect={() => setImplementationProfitMode("costs")}
            />
          </div>
        </div>

        {implementationProfitMode === "margin" ? (
          <FieldBlock
            label="Implementation gross margin (%)"
            helper={`Formatted: ${percentText(current.implementationGrossMargin)}`}
          >
            <input
              type="number"
              name="implementationGrossMargin"
              value={percentInputValue(current.implementationGrossMargin)}
              step="0.1"
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        ) : (
          <FieldBlock
            label="Implementation delivery cost per new customer"
            helper={`Formatted: ${displayMoney(current.implementationDeliveryCostPerNewCustomer)}`}
          >
            <input
              type="number"
              name="implementationDeliveryCostPerNewCustomer"
              value={current.implementationDeliveryCostPerNewCustomer ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        )}
      </>
    );
  };

  const renderEcommerceOrderProfitMode = (
    current: EcommerceOneTimeProductInput | EcommerceRepeatPurchaseProductInput,
  ) => {
    const orderProfitMode =
      current.grossProfitPerOrder != null || current.grossMargin == null
        ? "gross_profit"
        : "margin";

    return (
      <>
        <div className={panelClass}>
          <p className="font-medium">Gross profit input</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <ChoiceCard
              checked={orderProfitMode === "gross_profit"}
              title="Use gross profit per order"
              description="Best when you know contribution dollars after fulfillment and product cost."
              onSelect={() =>
                preserveScrollDuring(() => {
                  setValue({
                    grossProfitPerOrder:
                      "grossProfitPerOrder" in value ? value.grossProfitPerOrder : undefined,
                    grossMargin: undefined,
                  });
                })
              }
            />
            <ChoiceCard
              checked={orderProfitMode === "margin"}
              title="Use gross margin %"
              description="Best when you know margin faster than per-order contribution."
              onSelect={() =>
                preserveScrollDuring(() => {
                  setValue({
                    grossProfitPerOrder: undefined,
                    grossMargin: "grossMargin" in value ? value.grossMargin : undefined,
                  });
                })
              }
            />
          </div>
        </div>

        {orderProfitMode === "gross_profit" ? (
          <FieldBlock
            label="Gross profit per order"
            helper={`Formatted: ${displayMoney(current.grossProfitPerOrder)}`}
          >
            <input
              type="number"
              name="grossProfitPerOrder"
              value={current.grossProfitPerOrder ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        ) : (
          <FieldBlock
            label="Gross margin (%)"
            helper={`Formatted: ${percentText(current.grossMargin)}`}
          >
            <input
              type="number"
              name="grossMargin"
              value={percentInputValue(current.grossMargin)}
              step="0.1"
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        )}
      </>
    );
  };

  const renderEcommerceOneTimeFields = (current: EcommerceOneTimeProductInput) => (
    <>
      <div className={panelClass}>
        <p className="font-medium">One-time product model</p>
        <p className="mt-1 text-sm text-white/58">
          Model a single-order product using order value, refund drag, gross
          profit, and acquisition cost.
        </p>
      </div>

      <FieldBlock
        label={`New customers / orders (per ${periodLabel})`}
        helper={`Formatted: ${displayInt(current.newCustomersPerPeriod)}`}
      >
        <input
          type="number"
          name="newCustomersPerPeriod"
          value={current.newCustomersPerPeriod ?? ""}
          onChange={handleChange}
          className={fieldClass}
        />
      </FieldBlock>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldBlock
          label="Average order value"
          helper={`Formatted: ${displayMoney(current.averageOrderValue)}`}
        >
          <input
            type="number"
            name="averageOrderValue"
            value={current.averageOrderValue ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
        <FieldBlock
          label="Refund rate per order (%)"
          helper={`Formatted: ${percentText(current.refundsRatePerOrder)}`}
        >
          <input
            type="number"
            name="refundsRatePerOrder"
            value={percentInputValue(current.refundsRatePerOrder)}
            step="0.1"
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
      </div>

      {renderEcommerceOrderProfitMode(current)}
      {renderCacSection()}
    </>
  );

  const renderEcommerceRepeatFields = (
    current: EcommerceRepeatPurchaseProductInput,
  ) => (
    <>
      <div className={panelClass}>
        <p className="font-medium">Repeat-purchase product model</p>
        <p className="mt-1 text-sm text-white/58">
          Keep the first-order economics explicit, then layer in the expected
          lifetime order count for each acquired customer.
        </p>
      </div>

      <FieldBlock
        label={`New customers / first orders (per ${periodLabel})`}
        helper={`Formatted: ${displayInt(current.newCustomersPerPeriod)}`}
      >
        <input
          type="number"
          name="newCustomersPerPeriod"
          value={current.newCustomersPerPeriod ?? ""}
          onChange={handleChange}
          className={fieldClass}
        />
      </FieldBlock>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldBlock
          label="Average order value"
          helper={`Formatted: ${displayMoney(current.averageOrderValue)}`}
        >
          <input
            type="number"
            name="averageOrderValue"
            value={current.averageOrderValue ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
        <FieldBlock
          label="Expected orders per customer"
          helper={`Formatted: ${displayInt(current.expectedOrdersPerCustomer)}`}
        >
          <input
            type="number"
            name="expectedOrdersPerCustomer"
            value={current.expectedOrdersPerCustomer ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
      </div>

      <FieldBlock
        label="Refund rate per order (%)"
        helper={`Formatted: ${percentText(current.refundsRatePerOrder)}`}
      >
        <input
          type="number"
          name="refundsRatePerOrder"
          value={percentInputValue(current.refundsRatePerOrder)}
          step="0.1"
          onChange={handleChange}
          className={fieldClass}
        />
      </FieldBlock>

      {renderEcommerceOrderProfitMode(current)}
      {renderCacSection()}
    </>
  );

  const renderEcommerceReplenishmentFields = (
    current: EcommerceSubscriptionReplenishmentInput,
  ) => {
    const recurringProfitMode =
      current.grossProfitPerSubscriberPerPeriod != null || current.grossMargin == null
        ? "gross_profit"
        : "margin";

    return (
      <>
        <div className={panelClass}>
          <p className="font-medium">Subscription / replenishment model</p>
          <p className="mt-1 text-sm text-white/58">
            Use this for consumable products with recurring replenishment, churn,
            and steady-state customer-base dynamics.
          </p>
        </div>

        <FieldBlock
          label={`New subscribers (per ${periodLabel})`}
          helper={`Formatted: ${displayInt(current.newCustomersPerPeriod)}`}
        >
          <input
            type="number"
            name="newCustomersPerPeriod"
            value={current.newCustomersPerPeriod ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>

        {renderCacSection()}
        {renderRetentionSection(current)}

        <div className="grid gap-4 md:grid-cols-2">
          <FieldBlock
            label="Average order value"
            helper={`Formatted: ${displayMoney(current.averageOrderValue)}`}
          >
            <input
              type="number"
              name="averageOrderValue"
              value={current.averageOrderValue ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
          <FieldBlock
            label={`Orders per subscriber (per ${periodLabel}, optional)`}
            helper={`Formatted: ${displayInt(current.ordersPerSubscriberPerPeriod)}`}
          >
            <input
              type="number"
              name="ordersPerSubscriberPerPeriod"
              value={current.ordersPerSubscriberPerPeriod ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        </div>

        <FieldBlock
          label={`Refund rate per ${periodLabel} (%)`}
          helper={`Formatted: ${percentText(current.refundsRatePerPeriod)}`}
        >
          <input
            type="number"
            name="refundsRatePerPeriod"
            value={percentInputValue(current.refundsRatePerPeriod)}
            step="0.1"
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>

        <div className={panelClass}>
          <p className="font-medium">Gross profit input</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <ChoiceCard
              checked={recurringProfitMode === "gross_profit"}
              title="Use gross profit per subscriber period"
              description="Best when you know contribution dollars after fulfillment for each subscriber."
              onSelect={() =>
                preserveScrollDuring(() => {
                  setValue({
                    grossProfitPerSubscriberPerPeriod:
                      "grossProfitPerSubscriberPerPeriod" in value
                        ? value.grossProfitPerSubscriberPerPeriod
                        : undefined,
                    grossMargin: undefined,
                  });
                })
              }
            />
            <ChoiceCard
              checked={recurringProfitMode === "margin"}
              title="Use gross margin %"
              description="Best when you know recurring margin but not subscriber-level contribution dollars."
              onSelect={() =>
                preserveScrollDuring(() => {
                  setValue({
                    grossProfitPerSubscriberPerPeriod: undefined,
                    grossMargin: "grossMargin" in value ? value.grossMargin : undefined,
                  });
                })
              }
            />
          </div>
        </div>

        {recurringProfitMode === "gross_profit" ? (
          <FieldBlock
            label={`Gross profit per subscriber (per ${periodLabel})`}
            helper={`Formatted: ${displayMoney(current.grossProfitPerSubscriberPerPeriod)}`}
          >
            <input
              type="number"
              name="grossProfitPerSubscriberPerPeriod"
              value={current.grossProfitPerSubscriberPerPeriod ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        ) : (
          <FieldBlock
            label="Gross margin (%)"
            helper={`Formatted: ${percentText(current.grossMargin)}`}
          >
            <input
              type="number"
              name="grossMargin"
              value={percentInputValue(current.grossMargin)}
              step="0.1"
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        )}
      </>
    );
  };

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

      <OfferTypePills
        industry={activeIndustry}
        value={value.offerType}
        onIndustryChange={setIndustry}
        onChange={setOfferType}
      />

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

      {isSubscription && renderSubscriptionFields(value)}
      {isPaidPilot && renderPaidPilotFields(value)}
      {isTokenPricing && renderTokenFields(value)}
      {isHybrid && renderHybridFields(value)}
      {isImplementation && renderImplementationFields(value)}
      {isEcommerceOneTime && renderEcommerceOneTimeFields(value)}
      {isEcommerceRepeat && renderEcommerceRepeatFields(value)}
      {isEcommerceReplenishment && renderEcommerceReplenishmentFields(value)}

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
