"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type {
  SoftwareHybridPlatformUsageInput,
  SoftwareImplementationPlusSubscriptionInput,
  SoftwarePaidPilotInput,
  SoftwareTokenPricingInput,
  SubscriptionOfferInput,
} from "@/features/kpi/types";
import type { KPIInputState, SupportedSoftwareOfferType } from "./types";
import { createDefaultOfferInput } from "./types";
import OfferTypePills from "./OfferTypePills";
import {
  ChoiceCard,
  FieldBlock,
  SelectField,
  fieldClassName,
  panelClassName,
  pillClassName,
} from "./form-primitives";
import { parsePercentInput, percentInputValue, percentText } from "./percent";

type OnboardingStepId =
  | "setup"
  | "revenue"
  | "retention"
  | "acquisition"
  | "gross_profit"
  | "review";

type OnboardingStep = {
  id: OnboardingStepId;
  label: string;
  description: string;
};

const isSubscription = (
  value: KPIInputState,
): value is SubscriptionOfferInput => value.offerType === "software_subscription";

const isPaidPilot = (
  value: KPIInputState,
): value is SoftwarePaidPilotInput => value.offerType === "software_paid_pilot";

const isTokenPricing = (
  value: KPIInputState,
): value is SoftwareTokenPricingInput => value.offerType === "software_token_pricing";

const isHybrid = (
  value: KPIInputState,
): value is SoftwareHybridPlatformUsageInput =>
  value.offerType === "software_hybrid_platform_usage";

const isImplementation = (
  value: KPIInputState,
): value is SoftwareImplementationPlusSubscriptionInput =>
  value.offerType === "software_implementation_plus_subscription";

const stepsFor = (value: KPIInputState): OnboardingStep[] => {
  const steps: OnboardingStep[] = [
    {
      id: "setup",
      label: "Offer setup",
      description: "Pick the software offer model and basic reporting settings.",
    },
    {
      id: "revenue",
      label: "Revenue model",
      description: "Describe how this offer makes money.",
    },
  ];

  if (!isPaidPilot(value)) {
    steps.push({
      id: "retention",
      label: "Retention",
      description: "Capture sales velocity and how customers stay or churn.",
    });
  }

  steps.push(
    {
      id: "acquisition",
      label: "Acquisition",
      description: "Choose how CAC is modeled for this offer.",
    },
    {
      id: "gross_profit",
      label: "Gross profit",
      description: "Set the margin or cost inputs that drive profit quality.",
    },
    {
      id: "review",
      label: "Review",
      description: "Run the scenario and open the result view.",
    },
  );

  return steps;
};

const hasRecurringCostInputs = (
  value: SubscriptionOfferInput | SoftwareImplementationPlusSubscriptionInput,
) => {
  if ((value.grossProfitInputMode ?? "margin") === "margin") {
    return value.grossMargin != null;
  }
  return (
    value.deliveryCostPerCustomerPerPeriod != null ||
    value.fixedDeliveryCostPerPeriod != null
  );
};

const isStepComplete = (
  stepId: OnboardingStepId,
  value: KPIInputState,
): boolean => {
  if (stepId === "setup") {
    return value.offerName.trim().length > 0 && value.offerId.trim().length > 0;
  }

  if (stepId === "revenue") {
    if (isSubscription(value)) {
      if ((value.calculatorMode ?? "business_metrics") === "business_metrics") {
        return value.revenuePerPeriod != null && value.activeCustomersStart != null;
      }
      return value.directArpc != null;
    }
    if (isPaidPilot(value)) {
      return value.pilotFeePerNewCustomer != null;
    }
    if (isTokenPricing(value)) {
      return (
        value.activeCustomersStart != null &&
        value.usageUnitsPerCustomerPerPeriod != null &&
        value.pricePerUsageUnit != null
      );
    }
    if (isHybrid(value)) {
      return (
        value.activeCustomersStart != null &&
        value.platformFeePerCustomerPerPeriod != null &&
        value.usageUnitsPerCustomerPerPeriod != null &&
        value.pricePerUsageUnit != null
      );
    }
    if (isImplementation(value)) {
      return (
        value.activeCustomersStart != null &&
        value.directArpc != null &&
        value.implementationFeePerNewCustomer != null
      );
    }
  }

  if (stepId === "retention") {
    if (isPaidPilot(value)) {
      return true;
    }
    if (isSubscription(value)) {
      if ((value.calculatorMode ?? "business_metrics") === "unit_economics") {
        return (
          value.newCustomersPerPeriod != null &&
          value.directChurnRatePerPeriod != null
        );
      }
      return (
        value.newCustomersPerPeriod != null &&
        (value.retainedCustomersFromStartAtEnd != null ||
          value.churnedCustomersPerPeriod != null)
      );
    }

    if (
      (value.retentionInputMode ?? "counts") === "rate" &&
      "directChurnRatePerPeriod" in value
    ) {
      return (
        value.newCustomersPerPeriod != null &&
        value.directChurnRatePerPeriod != null
      );
    }

    return (
      value.newCustomersPerPeriod != null &&
      ("retainedCustomersFromStartAtEnd" in value &&
        (value.retainedCustomersFromStartAtEnd != null ||
          value.churnedCustomersPerPeriod != null))
    );
  }

  if (stepId === "acquisition") {
    if ((value.cacInputMode ?? "derived") === "direct") {
      return value.directCac != null;
    }
    return value.marketingSpendPerPeriod != null;
  }

  if (stepId === "gross_profit") {
    if (isSubscription(value)) {
      return hasRecurringCostInputs(value);
    }
    if (isPaidPilot(value)) {
      return (
        value.pilotGrossMargin != null ||
        value.pilotDeliveryCostPerNewCustomer != null
      );
    }
    if (isTokenPricing(value)) {
      return value.costPerUsageUnit != null;
    }
    if (isHybrid(value)) {
      return true;
    }
    if (isImplementation(value)) {
      const implementationValid =
        value.implementationGrossMargin != null ||
        value.implementationDeliveryCostPerNewCustomer != null;
      return hasRecurringCostInputs(value) && implementationValid;
    }
  }

  if (stepId === "review") {
    return stepsFor(value)
      .filter((step) => step.id !== "review")
      .every((step) => isStepComplete(step.id, value));
  }

  return false;
};

const SoftwareOnboardingFlow = ({
  value,
  onChange,
  onCalculate,
  isCalculating,
  error,
  onComplete,
}: {
  value: KPIInputState;
  onChange: (next: KPIInputState) => void;
  onCalculate: () => Promise<boolean>;
  isCalculating: boolean;
  error?: string | null;
  onComplete?: () => void;
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = useMemo(() => stepsFor(value), [value]);
  const boundedStepIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[boundedStepIndex];
  const money = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
    [],
  );
  const integer = useMemo(
    () => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }),
    [],
  );

  const periodLabel = `${value.analysisPeriod} period`;
  const fieldClass = fieldClassName;
  const panelClass = panelClassName;

  const setValue = (patch: Partial<KPIInputState>) => {
    onChange({ ...value, ...patch } as KPIInputState);
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value: nextValue } = event.target;
    if (["offerName", "offerId", "analysisPeriod"].includes(name)) {
      setValue({ [name]: nextValue } as Partial<KPIInputState>);
      return;
    }
    if (nextValue === "") {
      setValue({ [name]: undefined } as Partial<KPIInputState>);
      return;
    }
    if (
      [
        "grossMargin",
        "pilotGrossMargin",
        "implementationGrossMargin",
        "directChurnRatePerPeriod",
      ].includes(name)
    ) {
      setValue({ [name]: parsePercentInput(nextValue) } as Partial<KPIInputState>);
      return;
    }
    const numeric = Number(nextValue);
    if (!Number.isNaN(numeric)) {
      setValue({ [name]: numeric } as Partial<KPIInputState>);
    }
  };

  const setOfferType = (offerType: SupportedSoftwareOfferType) => {
    const next = createDefaultOfferInput(offerType);
    next.analysisPeriod = value.analysisPeriod;
    onChange(next);
    setStepIndex(0);
  };

  const formatMoney = (input?: number) => (input == null ? "—" : money.format(input));
  const formatInt = (input?: number) => (input == null ? "—" : integer.format(input));

  const goNext = () => {
    if (!isStepComplete(currentStep.id, value)) {
      return;
    }
    setStepIndex(Math.min(boundedStepIndex + 1, steps.length - 1));
  };

  const goBack = () => {
    setStepIndex(Math.max(boundedStepIndex - 1, 0));
  };

  const handleRunScenario = async () => {
    const success = await onCalculate();
    if (success) {
      onComplete?.();
    }
  };

  const renderSetupStep = () => (
    <div className="space-y-4">
      <OfferTypePills value={value.offerType} onChange={setOfferType} />

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
    </div>
  );

  const renderRevenueStep = () => {
    if (isSubscription(value)) {
      const calculatorMode = value.calculatorMode ?? "business_metrics";
      return (
        <div className="space-y-4">
          <div className={panelClass}>
            <p className="font-medium">Subscription model</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <ChoiceCard
                checked={calculatorMode === "unit_economics"}
                title="Unit economics"
                description="Start from price, churn, CAC, and gross profit."
                onSelect={() =>
                  onChange({
                    ...value,
                    calculatorMode: "unit_economics",
                    revenueInputMode: "direct_arpc",
                    cacInputMode: "direct",
                    retentionInputMode: "rate",
                  })
                }
              />
              <ChoiceCard
                checked={calculatorMode === "business_metrics"}
                title="Business metrics"
                description="Start from revenue, customer counts, and spend."
                onSelect={() =>
                  onChange({
                    ...value,
                    calculatorMode: "business_metrics",
                    revenueInputMode: "total_revenue",
                    cacInputMode: "derived",
                    retentionInputMode: "counts",
                  })
                }
              />
            </div>
          </div>

          {calculatorMode === "business_metrics" ? (
            <>
              <FieldBlock
                label={`Current revenue run rate (per ${periodLabel})`}
                helper={`Formatted: ${formatMoney(value.revenuePerPeriod)}`}
              >
                <input
                  type="number"
                  name="revenuePerPeriod"
                  value={value.revenuePerPeriod ?? ""}
                  onChange={handleChange}
                  className={fieldClass}
                />
              </FieldBlock>
              <FieldBlock
                label="Starting customer base"
                helper={`Formatted: ${formatInt(value.activeCustomersStart)}`}
              >
                <input
                  type="number"
                  name="activeCustomersStart"
                  value={value.activeCustomersStart ?? ""}
                  onChange={handleChange}
                  className={fieldClass}
                />
              </FieldBlock>
            </>
          ) : (
            <FieldBlock
              label={`Subscription price / ARPC (per ${periodLabel})`}
              helper={`Formatted: ${formatMoney(value.directArpc)}`}
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
        </div>
      );
    }

    if (isPaidPilot(value)) {
      return (
        <FieldBlock
          label="Pilot fee per new customer"
          helper={`Formatted: ${formatMoney(value.pilotFeePerNewCustomer)}`}
        >
          <input
            type="number"
            name="pilotFeePerNewCustomer"
            value={value.pilotFeePerNewCustomer ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
      );
    }

    if (isTokenPricing(value)) {
      return (
        <div className="space-y-4">
          <FieldBlock
            label="Starting customer base"
            helper={`Formatted: ${formatInt(value.activeCustomersStart)}`}
          >
            <input
              type="number"
              name="activeCustomersStart"
              value={value.activeCustomersStart ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldBlock
              label={`Usage units per customer (per ${periodLabel})`}
              helper={`Formatted: ${formatInt(value.usageUnitsPerCustomerPerPeriod)}`}
            >
              <input
                type="number"
                name="usageUnitsPerCustomerPerPeriod"
                value={value.usageUnitsPerCustomerPerPeriod ?? ""}
                onChange={handleChange}
                className={fieldClass}
              />
            </FieldBlock>
            <FieldBlock
              label="Price per usage unit"
              helper={`Formatted: ${formatMoney(value.pricePerUsageUnit)}`}
            >
              <input
                type="number"
                name="pricePerUsageUnit"
                value={value.pricePerUsageUnit ?? ""}
                onChange={handleChange}
                className={fieldClass}
              />
            </FieldBlock>
          </div>
        </div>
      );
    }

    if (isHybrid(value)) {
      return (
        <div className="space-y-4">
          <FieldBlock
            label="Starting customer base"
            helper={`Formatted: ${formatInt(value.activeCustomersStart)}`}
          >
            <input
              type="number"
              name="activeCustomersStart"
              value={value.activeCustomersStart ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldBlock
              label={`Platform fee per customer (per ${periodLabel})`}
              helper={`Formatted: ${formatMoney(value.platformFeePerCustomerPerPeriod)}`}
            >
              <input
                type="number"
                name="platformFeePerCustomerPerPeriod"
                value={value.platformFeePerCustomerPerPeriod ?? ""}
                onChange={handleChange}
                className={fieldClass}
              />
            </FieldBlock>
            <FieldBlock
              label={`Usage units per customer (per ${periodLabel})`}
              helper={`Formatted: ${formatInt(value.usageUnitsPerCustomerPerPeriod)}`}
            >
              <input
                type="number"
                name="usageUnitsPerCustomerPerPeriod"
                value={value.usageUnitsPerCustomerPerPeriod ?? ""}
                onChange={handleChange}
                className={fieldClass}
              />
            </FieldBlock>
          </div>
          <FieldBlock
            label="Price per usage unit"
            helper={`Formatted: ${formatMoney(value.pricePerUsageUnit)}`}
          >
            <input
              type="number"
              name="pricePerUsageUnit"
              value={value.pricePerUsageUnit ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <FieldBlock
          label="Starting customer base"
          helper={`Formatted: ${formatInt(value.activeCustomersStart)}`}
        >
          <input
            type="number"
            name="activeCustomersStart"
            value={value.activeCustomersStart ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>
        <div className="grid gap-4 md:grid-cols-2">
          <FieldBlock
            label={`Recurring subscription ARPC (per ${periodLabel})`}
            helper={`Formatted: ${formatMoney(value.directArpc)}`}
          >
            <input
              type="number"
              name="directArpc"
              value={value.directArpc ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
          <FieldBlock
            label="Implementation fee per new customer"
            helper={`Formatted: ${formatMoney(value.implementationFeePerNewCustomer)}`}
          >
            <input
              type="number"
              name="implementationFeePerNewCustomer"
              value={value.implementationFeePerNewCustomer ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        </div>
      </div>
    );
  };

  const renderRetentionStep = () => {
    if (isPaidPilot(value)) {
      return null;
    }

    const retentionMode = isSubscription(value)
      ? (value.calculatorMode ?? "business_metrics") === "unit_economics"
        ? "rate"
        : "counts"
      : value.retentionInputMode ?? "counts";

    return (
      <div className="space-y-4">
        <FieldBlock
          label={`New customers (per ${periodLabel})`}
          helper={`Formatted: ${formatInt(value.newCustomersPerPeriod)}`}
        >
          <input
            type="number"
            name="newCustomersPerPeriod"
            value={value.newCustomersPerPeriod ?? ""}
            onChange={handleChange}
            className={fieldClass}
          />
        </FieldBlock>

        {!isSubscription(value) || (value.calculatorMode ?? "business_metrics") === "business_metrics" ? (
          <div className={panelClass}>
            <p className="font-medium">Retention input</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <ChoiceCard
                checked={retentionMode === "counts"}
                title="Use cohort counts"
                description="Track retained or churned customers from the starting cohort."
                onSelect={() =>
                  setValue({ retentionInputMode: "counts" } as Partial<KPIInputState>)
                }
              />
              <ChoiceCard
                checked={retentionMode === "rate"}
                title="Use direct churn rate"
                description="Use a direct churn percentage when that is easier."
                onSelect={() =>
                  setValue({ retentionInputMode: "rate" } as Partial<KPIInputState>)
                }
              />
            </div>
          </div>
        ) : null}

        {retentionMode === "rate" ? (
          <FieldBlock
            label={`Churn rate per ${periodLabel} (%)`}
            helper={`Formatted: ${percentText(
              "directChurnRatePerPeriod" in value ? value.directChurnRatePerPeriod : undefined,
            )}`}
          >
            <input
              type="number"
              name="directChurnRatePerPeriod"
              value={percentInputValue(
                "directChurnRatePerPeriod" in value
                  ? value.directChurnRatePerPeriod
                  : undefined,
              )}
              step="0.1"
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <FieldBlock
              label="Customers from start still active at end"
              helper={`Formatted: ${formatInt(
                "retainedCustomersFromStartAtEnd" in value
                  ? value.retainedCustomersFromStartAtEnd
                  : undefined,
              )}`}
            >
              <input
                type="number"
                name="retainedCustomersFromStartAtEnd"
                value={
                  "retainedCustomersFromStartAtEnd" in value
                    ? value.retainedCustomersFromStartAtEnd ?? ""
                    : ""
                }
                onChange={handleChange}
                className={fieldClass}
              />
            </FieldBlock>
            <FieldBlock
              label="Churned customers per period (optional)"
              helper={`Formatted: ${formatInt(
                "churnedCustomersPerPeriod" in value
                  ? value.churnedCustomersPerPeriod
                  : undefined,
              )}`}
            >
              <input
                type="number"
                name="churnedCustomersPerPeriod"
                value={
                  "churnedCustomersPerPeriod" in value
                    ? value.churnedCustomersPerPeriod ?? ""
                    : ""
                }
                onChange={handleChange}
                className={fieldClass}
              />
            </FieldBlock>
          </div>
        )}
      </div>
    );
  };

  const renderAcquisitionStep = () => {
    const cacInputMode = value.cacInputMode ?? "derived";

    return (
      <div className="space-y-4">
        <div className={panelClass}>
          <p className="font-medium">CAC input</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <ChoiceCard
              checked={cacInputMode === "derived"}
              title="Derive from spend"
              description="Enter acquisition spend for the selected period."
              onSelect={() => setValue({ cacInputMode: "derived" })}
            />
            <ChoiceCard
              checked={cacInputMode === "direct"}
              title="Use direct CAC"
              description="Use this when you already trust cost per acquisition."
              onSelect={() => setValue({ cacInputMode: "direct" })}
            />
          </div>
        </div>

        {cacInputMode === "derived" ? (
          <FieldBlock
            label={`Customer acquisition spend (per ${periodLabel})`}
            helper={`Formatted: ${formatMoney(value.marketingSpendPerPeriod)}`}
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
            helper={`Formatted: ${formatMoney(value.directCac)}`}
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
    );
  };

  const renderGrossProfitStep = () => {
    if (isSubscription(value)) {
      const mode = value.grossProfitInputMode ?? "margin";
      return (
        <div className="space-y-4">
          <div className={panelClass}>
            <p className="font-medium">Recurring gross profit input</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <ChoiceCard
                checked={mode === "margin"}
                title="Use gross margin"
                description="Use a margin percentage when you trust the margin profile."
                onSelect={() => setValue({ grossProfitInputMode: "margin" })}
              />
              <ChoiceCard
                checked={mode === "costs"}
                title="Use delivery costs"
                description="Use cost inputs when service cost is easier than margin."
                onSelect={() => setValue({ grossProfitInputMode: "costs" })}
              />
            </div>
          </div>

          {mode === "margin" ? (
            <FieldBlock
              label="Gross margin (%)"
              helper={`Formatted: ${percentText(value.grossMargin)}`}
            >
              <input
                type="number"
                name="grossMargin"
                value={percentInputValue(value.grossMargin)}
                step="0.1"
                onChange={handleChange}
                className={fieldClass}
              />
            </FieldBlock>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <FieldBlock
                label={`Delivery cost per active customer (per ${periodLabel})`}
                helper={`Formatted: ${formatMoney(
                  value.deliveryCostPerCustomerPerPeriod,
                )}`}
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
                helper={`Formatted: ${formatMoney(value.fixedDeliveryCostPerPeriod)}`}
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
        </div>
      );
    }

    if (isPaidPilot(value)) {
      const pilotMode =
        value.pilotGrossMargin != null || value.pilotDeliveryCostPerNewCustomer == null
          ? "margin"
          : "costs";
      return (
        <div className="space-y-4">
          <div className={panelClass}>
            <p className="font-medium">Pilot gross profit input</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <ChoiceCard
                checked={pilotMode === "margin"}
                title="Use pilot gross margin"
                description="Use a margin percentage for the pilot delivery model."
                onSelect={() =>
                  onChange({
                    ...value,
                    pilotDeliveryCostPerNewCustomer: undefined,
                  })
                }
              />
              <ChoiceCard
                checked={pilotMode === "costs"}
                title="Use pilot delivery cost"
                description="Use direct cost to deliver each pilot."
                onSelect={() =>
                  onChange({
                    ...value,
                    pilotGrossMargin: undefined,
                  })
                }
              />
            </div>
          </div>

          {pilotMode === "margin" ? (
            <FieldBlock
              label="Pilot gross margin (%)"
              helper={`Formatted: ${percentText(value.pilotGrossMargin)}`}
            >
              <input
                type="number"
                name="pilotGrossMargin"
                value={percentInputValue(value.pilotGrossMargin)}
                step="0.1"
                onChange={handleChange}
                className={fieldClass}
              />
            </FieldBlock>
          ) : (
            <FieldBlock
              label="Pilot delivery cost per new customer"
              helper={`Formatted: ${formatMoney(value.pilotDeliveryCostPerNewCustomer)}`}
            >
              <input
                type="number"
                name="pilotDeliveryCostPerNewCustomer"
                value={value.pilotDeliveryCostPerNewCustomer ?? ""}
                onChange={handleChange}
                className={fieldClass}
              />
            </FieldBlock>
          )}
        </div>
      );
    }

    if (isTokenPricing(value)) {
      return (
        <div className="space-y-4">
          <FieldBlock
            label="Cost per usage unit"
            helper={`Formatted: ${formatMoney(value.costPerUsageUnit)}`}
          >
            <input
              type="number"
              name="costPerUsageUnit"
              value={value.costPerUsageUnit ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
          <FieldBlock
            label={`Fixed delivery cost (optional, per ${periodLabel})`}
            helper={`Formatted: ${formatMoney(value.fixedDeliveryCostPerPeriod)}`}
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
      );
    }

    if (isHybrid(value)) {
      return (
        <div className="grid gap-4 md:grid-cols-3">
          <FieldBlock
            label={`Platform delivery cost per customer (optional, per ${periodLabel})`}
            helper={`Formatted: ${formatMoney(
              value.platformDeliveryCostPerCustomerPerPeriod,
            )}`}
          >
            <input
              type="number"
              name="platformDeliveryCostPerCustomerPerPeriod"
              value={value.platformDeliveryCostPerCustomerPerPeriod ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
          <FieldBlock
            label="Cost per usage unit (optional)"
            helper={`Formatted: ${formatMoney(value.costPerUsageUnit)}`}
          >
            <input
              type="number"
              name="costPerUsageUnit"
              value={value.costPerUsageUnit ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
          <FieldBlock
            label={`Fixed delivery cost (optional, per ${periodLabel})`}
            helper={`Formatted: ${formatMoney(value.fixedDeliveryCostPerPeriod)}`}
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
      );
    }

    const recurringMode = value.grossProfitInputMode ?? "margin";
    const implementationMode =
      value.implementationGrossMargin != null ||
      value.implementationDeliveryCostPerNewCustomer == null
        ? "margin"
        : "costs";

    return (
      <div className="space-y-4">
        <div className={panelClass}>
          <p className="font-medium">Recurring subscription gross profit</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <ChoiceCard
              checked={recurringMode === "margin"}
              title="Use recurring gross margin"
              description="Use a margin percentage for the recurring offer."
              onSelect={() => setValue({ grossProfitInputMode: "margin" })}
            />
            <ChoiceCard
              checked={recurringMode === "costs"}
              title="Use recurring delivery costs"
              description="Use recurring service costs instead of a margin."
              onSelect={() => setValue({ grossProfitInputMode: "costs" })}
            />
          </div>
        </div>

        {recurringMode === "margin" ? (
          <FieldBlock
            label="Recurring gross margin (%)"
            helper={`Formatted: ${percentText(value.grossMargin)}`}
          >
            <input
              type="number"
              name="grossMargin"
              value={percentInputValue(value.grossMargin)}
              step="0.1"
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <FieldBlock
              label={`Recurring delivery cost per active customer (per ${periodLabel})`}
              helper={`Formatted: ${formatMoney(
                value.deliveryCostPerCustomerPerPeriod,
              )}`}
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
              helper={`Formatted: ${formatMoney(value.fixedDeliveryCostPerPeriod)}`}
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

        <div className={panelClass}>
          <p className="font-medium">Implementation gross profit</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <ChoiceCard
              checked={implementationMode === "margin"}
              title="Use implementation gross margin"
              description="Use an expected margin for the onboarding project."
              onSelect={() =>
                onChange({
                  ...value,
                  implementationDeliveryCostPerNewCustomer: undefined,
                })
              }
            />
            <ChoiceCard
              checked={implementationMode === "costs"}
              title="Use implementation delivery cost"
              description="Use direct project delivery cost per new customer."
              onSelect={() =>
                onChange({
                  ...value,
                  implementationGrossMargin: undefined,
                })
              }
            />
          </div>
        </div>

        {implementationMode === "margin" ? (
          <FieldBlock
            label="Implementation gross margin (%)"
            helper={`Formatted: ${percentText(value.implementationGrossMargin)}`}
          >
            <input
              type="number"
              name="implementationGrossMargin"
              value={percentInputValue(value.implementationGrossMargin)}
              step="0.1"
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        ) : (
          <FieldBlock
            label="Implementation delivery cost per new customer"
            helper={`Formatted: ${formatMoney(
              value.implementationDeliveryCostPerNewCustomer,
            )}`}
          >
            <input
              type="number"
              name="implementationDeliveryCostPerNewCustomer"
              value={value.implementationDeliveryCostPerNewCustomer ?? ""}
              onChange={handleChange}
              className={fieldClass}
            />
          </FieldBlock>
        )}
      </div>
    );
  };

  const renderReviewStep = () => {
    const rows = [
      { label: "Offer model", value: value.offerType.replaceAll("_", " ") },
      { label: "Analysis period", value: value.analysisPeriod },
      { label: "New customers", value: formatInt(value.newCustomersPerPeriod) },
      {
        label: "CAC path",
        value:
          (value.cacInputMode ?? "derived") === "direct"
            ? `Direct CAC ${formatMoney(value.directCac)}`
            : `Spend ${formatMoney(value.marketingSpendPerPeriod)}`,
      },
    ];

    if (isSubscription(value)) {
      rows.unshift({
        label: "Revenue driver",
        value:
          (value.calculatorMode ?? "business_metrics") === "unit_economics"
            ? `ARPC ${formatMoney(value.directArpc)}`
            : `Revenue ${formatMoney(value.revenuePerPeriod)}`,
      });
    } else if (isPaidPilot(value)) {
      rows.unshift({
        label: "Revenue driver",
        value: `Pilot fee ${formatMoney(value.pilotFeePerNewCustomer)}`,
      });
    } else if (isTokenPricing(value)) {
      rows.unshift({
        label: "Revenue driver",
        value: `${formatInt(value.usageUnitsPerCustomerPerPeriod)} usage units at ${formatMoney(value.pricePerUsageUnit)}`,
      });
    } else if (isHybrid(value)) {
      rows.unshift({
        label: "Revenue driver",
        value: `Platform ${formatMoney(value.platformFeePerCustomerPerPeriod)} + usage ${formatMoney(value.pricePerUsageUnit)}`,
      });
    } else {
      rows.unshift({
        label: "Revenue driver",
        value: `Recurring ${formatMoney(value.directArpc)} + implementation ${formatMoney(value.implementationFeePerNewCustomer)}`,
      });
    }

    return (
      <div className="space-y-4">
        <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm text-white/58">
            Run this scenario and the app will open the result view with the
            health summary and best-next-move recommendation.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="rounded-[18px] border border-white/8 bg-black/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/36">
                  {row.label}
                </p>
                <p className="mt-2 text-sm text-white/82">{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-[20px] border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        ) : null}
      </div>
    );
  };

  const renderStepBody = () => {
    if (currentStep.id === "setup") return renderSetupStep();
    if (currentStep.id === "revenue") return renderRevenueStep();
    if (currentStep.id === "retention") return renderRetentionStep();
    if (currentStep.id === "acquisition") return renderAcquisitionStep();
    if (currentStep.id === "gross_profit") return renderGrossProfitStep();
    return renderReviewStep();
  };

  return (
    <div className="space-y-5 text-white">
      <div className="rounded-[22px] border border-white/8 bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/34">
              Guided setup
            </p>
            <h3 className="mt-2 text-lg font-semibold">{currentStep.label}</h3>
            <p className="mt-1 text-sm text-white/56">{currentStep.description}</p>
          </div>
          <p className="text-sm text-white/48">
            Step {boundedStepIndex + 1} of {steps.length}
          </p>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-6">
          {steps.map((step, index) => {
            const state =
              index === boundedStepIndex
                ? "active"
                : isStepComplete(step.id, value)
                  ? "complete"
                  : "upcoming";
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setStepIndex(index)}
                className={`rounded-full px-3 py-2 text-left text-xs transition ${
                  state === "active"
                    ? "bg-white text-black"
                    : state === "complete"
                      ? "border border-white/16 bg-white/[0.05] text-white"
                      : "border border-white/8 bg-black/20 text-white/42"
                }`}
              >
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      {renderStepBody()}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4">
        <button
          type="button"
          onClick={goBack}
          disabled={boundedStepIndex === 0}
          className={`${pillClassName} px-4 py-2 disabled:opacity-40`}
        >
          Back
        </button>

        <div className="flex gap-3">
          {currentStep.id === "review" ? (
            <button
              type="button"
              onClick={() => void handleRunScenario()}
              disabled={!isStepComplete("review", value) || isCalculating}
              className={`${pillClassName} px-4 py-2 disabled:opacity-50`}
            >
              {isCalculating ? "Calculating..." : "Run scenario"}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!isStepComplete(currentStep.id, value)}
              className={`${pillClassName} px-4 py-2 disabled:opacity-50`}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SoftwareOnboardingFlow;
