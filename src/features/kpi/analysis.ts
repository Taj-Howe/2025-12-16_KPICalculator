import { evaluateKpis } from "./service";
import type {
  CalculationVersion,
  KpiEvaluation,
  KPIResult,
  OfferInput,
  SoftwareHybridPlatformUsageInput,
  SoftwareImplementationPlusSubscriptionInput,
  SoftwarePaidPilotInput,
  SoftwareTokenPricingInput,
  SubscriptionOfferInput,
} from "./types";

export type SupportedAnalysisInput =
  | SubscriptionOfferInput
  | SoftwarePaidPilotInput
  | SoftwareTokenPricingInput
  | SoftwareHybridPlatformUsageInput
  | SoftwareImplementationPlusSubscriptionInput;

export type KpiMetricKey = keyof KPIResult;

export type AnalysisLever =
  | "sales_velocity"
  | "cac"
  | "churn"
  | "gross_margin"
  | "price"
  | "platform_price"
  | "usage_price"
  | "subscription_price"
  | "implementation_price";

export type ScenarioChangeMode = "absolute" | "percent";

export type AnalysisTargetMetric =
  | "projectedProfitNextYear"
  | "hypotheticalMaxProfitPerYear"
  | "ltgpToCacRatio"
  | "cacPaybackPeriods";

export type AnalysisBaselineSnapshot = {
  generatedAt: string;
  offerType: SupportedAnalysisInput["offerType"];
  offerId: string;
  offerName: string;
  analysisPeriod: SupportedAnalysisInput["analysisPeriod"];
  calculationVersion: CalculationVersion;
  inputs: SupportedAnalysisInput;
  results: KPIResult;
  warnings: string[];
  assumptionsApplied: string[];
};

export type ScenarioDefinition = {
  id: string;
  lever: AnalysisLever;
  label: string;
  mode: ScenarioChangeMode;
  amount: number;
  direction: "increase" | "decrease";
  fieldPath: string;
  baselineValue: number | null;
  scenarioValue: number | null;
  rationale: string;
};

export type MetricDelta = {
  metric: KpiMetricKey;
  baseline: number | null;
  scenario: number | null;
  absoluteDelta: number | null;
  percentDelta: number | null;
};

export type ScenarioEvaluation = {
  scenario: ScenarioDefinition;
  valid: boolean;
  invalidReason?: string;
  inputs: SupportedAnalysisInput | null;
  results: KPIResult | null;
  warnings: string[];
  assumptionsApplied: string[];
  metricDeltas: MetricDelta[];
  primaryOutcome: {
    metric: KpiMetricKey;
    baseline: number | null;
    scenario: number | null;
    absoluteDelta: number | null;
    percentDelta: number | null;
  };
};

export type SensitivitySweep = {
  lever: AnalysisLever;
  targetMetric: KpiMetricKey;
  mode: ScenarioChangeMode;
  steps: number[];
  scenarios: ScenarioEvaluation[];
};

export type OpportunityScore = {
  targetMetric: KpiMetricKey;
  baseline: number | null;
  scenario: number | null;
  absoluteDelta: number | null;
  percentDelta: number | null;
  betterDirection: "higher" | "lower";
  normalizedScore: number | null;
};

export type RankedOpportunity = {
  rank: number;
  scenarioId: string;
  lever: AnalysisLever;
  label: string;
  summary: string;
  scenario: ScenarioDefinition;
  score: OpportunityScore;
  keyDeltas: MetricDelta[];
  warnings: string[];
  confidence: "high" | "medium" | "low";
};

export type AnalysisReport = {
  version: "analysis-v1";
  baseline: AnalysisBaselineSnapshot;
  targetMetric: KpiMetricKey;
  generatedScenarios: ScenarioEvaluation[];
  sweeps: SensitivitySweep[];
  rankedOpportunities: RankedOpportunity[];
  bestOpportunity: RankedOpportunity | null;
};

export type AnalysisExportSource = "ui" | "api" | "report";

export type AnalysisExport = {
  version: "analysis-export-v1";
  baseline: AnalysisBaselineSnapshot;
  report: AnalysisReport;
  exportMetadata: {
    exportedAt: string;
    exportSource: AnalysisExportSource;
    schemaVersion: "analysis-export-v1";
  };
};

export type AnalysisScenarioRow = {
  baselineOfferId: string;
  baselineOfferName: string;
  baselineOfferType: string;
  analysisPeriod: string;
  calculationVersion: string;

  targetMetric: string;
  scenarioId: string;
  lever: string;
  label: string;
  mode: string;
  direction: string;
  amount: number;
  fieldPath: string;
  baselineValue: number | null;
  scenarioValue: number | null;
  valid: boolean;
  invalidReason: string | null;

  baseline_cac: number | null;
  scenario_cac: number | null;
  delta_cac_absolute: number | null;
  delta_cac_percent: number | null;

  baseline_arpc: number | null;
  scenario_arpc: number | null;
  delta_arpc_absolute: number | null;
  delta_arpc_percent: number | null;

  baseline_churnRate: number | null;
  scenario_churnRate: number | null;
  delta_churnRate_absolute: number | null;
  delta_churnRate_percent: number | null;

  baseline_retentionRate: number | null;
  scenario_retentionRate: number | null;
  delta_retentionRate_absolute: number | null;
  delta_retentionRate_percent: number | null;

  baseline_ltv: number | null;
  scenario_ltv: number | null;
  delta_ltv_absolute: number | null;
  delta_ltv_percent: number | null;

  baseline_ltgpPerCustomer: number | null;
  scenario_ltgpPerCustomer: number | null;
  delta_ltgpPerCustomer_absolute: number | null;
  delta_ltgpPerCustomer_percent: number | null;

  baseline_ltgpToCacRatio: number | null;
  scenario_ltgpToCacRatio: number | null;
  delta_ltgpToCacRatio_absolute: number | null;
  delta_ltgpToCacRatio_percent: number | null;

  baseline_cacPaybackPeriods: number | null;
  scenario_cacPaybackPeriods: number | null;
  delta_cacPaybackPeriods_absolute: number | null;
  delta_cacPaybackPeriods_percent: number | null;

  baseline_hypotheticalMaxCustomers: number | null;
  scenario_hypotheticalMaxCustomers: number | null;
  delta_hypotheticalMaxCustomers_absolute: number | null;
  delta_hypotheticalMaxCustomers_percent: number | null;

  baseline_hypotheticalMaxRevenuePerYear: number | null;
  scenario_hypotheticalMaxRevenuePerYear: number | null;
  delta_hypotheticalMaxRevenuePerYear_absolute: number | null;
  delta_hypotheticalMaxRevenuePerYear_percent: number | null;

  baseline_hypotheticalMaxProfitPerYear: number | null;
  scenario_hypotheticalMaxProfitPerYear: number | null;
  delta_hypotheticalMaxProfitPerYear_absolute: number | null;
  delta_hypotheticalMaxProfitPerYear_percent: number | null;

  baseline_projectedRevenueNextYear: number | null;
  scenario_projectedRevenueNextYear: number | null;
  delta_projectedRevenueNextYear_absolute: number | null;
  delta_projectedRevenueNextYear_percent: number | null;

  baseline_projectedProfitNextYear: number | null;
  scenario_projectedProfitNextYear: number | null;
  delta_projectedProfitNextYear_absolute: number | null;
  delta_projectedProfitNextYear_percent: number | null;

  baseline_car: number | null;
  scenario_car: number | null;
  delta_car_absolute: number | null;
  delta_car_percent: number | null;

  rank: number | null;
  score: number | null;
  confidence: string | null;
  warnings: string;
  assumptionsApplied: string;
};

type SupportedRecurringInput =
  | SubscriptionOfferInput
  | SoftwareTokenPricingInput
  | SoftwareHybridPlatformUsageInput
  | SoftwareImplementationPlusSubscriptionInput;

type ScenarioPlan = {
  fieldPath: string;
  baselineValue: number | null;
  scenarioValue: number | null;
  rationale: string;
  apply: (input: SupportedAnalysisInput) => SupportedAnalysisInput;
};

const metricKeys: KpiMetricKey[] = [
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

const deltaLookup = (deltas: MetricDelta[]) =>
  new Map(deltas.map((delta) => [delta.metric, delta] as const));

const supportedOfferTypes = new Set<SupportedAnalysisInput["offerType"]>([
  "software_subscription",
  "software_paid_pilot",
  "software_token_pricing",
  "software_hybrid_platform_usage",
  "software_implementation_plus_subscription",
]);

const defaultTargetMetric: AnalysisTargetMetric = "projectedProfitNextYear";

const beneficialPercentStepsByLever: Record<AnalysisLever, number[]> = {
  sales_velocity: [0.05, 0.1, 0.15],
  cac: [-0.05, -0.1, -0.15],
  churn: [-0.05, -0.1, -0.15],
  gross_margin: [0.05, 0.1, 0.15],
  price: [0.05, 0.1, 0.15],
  platform_price: [0.05, 0.1, 0.15],
  usage_price: [0.05, 0.1, 0.15],
  subscription_price: [0.05, 0.1, 0.15],
  implementation_price: [0.05, 0.1, 0.15],
};

const isSupportedAnalysisInput = (
  input: OfferInput,
): input is SupportedAnalysisInput => {
  return supportedOfferTypes.has(input.offerType as SupportedAnalysisInput["offerType"]);
};

const isRecurringOffer = (
  input: SupportedAnalysisInput,
): input is SupportedRecurringInput => {
  return input.offerType !== "software_paid_pilot";
};

const cloneInput = <T extends SupportedAnalysisInput>(input: T): T =>
  structuredClone(input);

const applyChange = (
  baselineValue: number,
  mode: ScenarioChangeMode,
  amount: number,
) => {
  return mode === "percent"
    ? baselineValue * (1 + amount)
    : baselineValue + amount;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const metricValue = (results: KPIResult, metric: KpiMetricKey) => results[metric];

const formatPercentChangeLabel = (amount: number) =>
  `${amount >= 0 ? "+" : ""}${(amount * 100).toFixed(0)}%`;

const formatAbsoluteLabel = (amount: number) => `${amount >= 0 ? "+" : ""}${amount}`;

const buildScenarioId = (
  baseline: AnalysisBaselineSnapshot,
  lever: AnalysisLever,
  mode: ScenarioChangeMode,
  amount: number,
) => {
  const normalized = String(amount).replace("-", "neg").replace(".", "_");
  return `${baseline.offerId}:${lever}:${mode}:${normalized}`;
};

const betterDirectionForMetric = (
  metric: KpiMetricKey,
): "higher" | "lower" => {
  if (metric === "cacPaybackPeriods") {
    return "lower";
  }
  return "higher";
};

const isCountSynthesizedField = (fieldPath: string) =>
  fieldPath === "retainedCustomersFromStartAtEnd" ||
  fieldPath === "churnedCustomersPerPeriod";

const ensureRecurring = (
  input: SupportedAnalysisInput,
  lever: AnalysisLever,
): SupportedRecurringInput => {
  if (!isRecurringOffer(input)) {
    throw new Error(`Lever '${lever}' is not supported for ${input.offerType}.`);
  }
  return input;
};

const resolveRecurringChurnField = (
  input: SupportedRecurringInput,
): "retainedCustomersFromStartAtEnd" | "churnedCustomersPerPeriod" => {
  if (
    "retainedCustomersFromStartAtEnd" in input &&
    input.retainedCustomersFromStartAtEnd != null
  ) {
    return "retainedCustomersFromStartAtEnd";
  }
  if ("churnedCustomersPerPeriod" in input && input.churnedCustomersPerPeriod != null) {
    return "churnedCustomersPerPeriod";
  }
  return "retainedCustomersFromStartAtEnd";
};

const getApplicableLevers = (input: SupportedAnalysisInput): AnalysisLever[] => {
  const levers: AnalysisLever[] = ["sales_velocity", "cac"];

  if (input.offerType === "software_subscription") {
    levers.push("churn");
    if ((input.grossProfitInputMode ?? "margin") === "margin") {
      levers.push("gross_margin");
    }
    if ((input.revenueInputMode ?? "total_revenue") === "direct_arpc") {
      levers.push("price");
    }
    return levers;
  }

  if (input.offerType === "software_paid_pilot") {
    levers.push("price");
    if (input.pilotGrossMargin != null) {
      levers.push("gross_margin");
    }
    return levers;
  }

  if (input.offerType === "software_token_pricing") {
    levers.push("churn", "price");
    return levers;
  }

  if (input.offerType === "software_hybrid_platform_usage") {
    levers.push("churn", "platform_price", "usage_price");
    return levers;
  }

  if (input.offerType === "software_implementation_plus_subscription") {
    levers.push("churn", "subscription_price", "implementation_price");
    if ((input.grossProfitInputMode ?? "margin") === "margin") {
      levers.push("gross_margin");
    }
  }

  return levers;
};

const buildScenarioPlan = (
  baseline: AnalysisBaselineSnapshot,
  lever: AnalysisLever,
  mode: ScenarioChangeMode,
  amount: number,
): ScenarioPlan => {
  const input = baseline.inputs;

  if (lever === "sales_velocity") {
    const baselineValue = input.newCustomersPerPeriod;
    const scenarioValue = Math.max(0, applyChange(baselineValue, mode, amount));
    return {
      fieldPath: "newCustomersPerPeriod",
      baselineValue,
      scenarioValue,
      rationale: "Adjusted sales velocity by changing newCustomersPerPeriod.",
      apply: (next) => ({ ...cloneInput(next), newCustomersPerPeriod: scenarioValue }),
    };
  }

  if (lever === "cac") {
    if ((input.cacInputMode ?? "derived") === "direct") {
      const baselineValue = input.directCac ?? null;
      if (baselineValue == null) {
        throw new Error("Direct CAC lever requires a baseline directCac value.");
      }
      const scenarioValue = Math.max(0, applyChange(baselineValue, mode, amount));
      return {
        fieldPath: "directCac",
        baselineValue,
        scenarioValue,
        rationale: "Adjusted direct CAC directly.",
        apply: (next) => ({ ...cloneInput(next), directCac: scenarioValue }),
      };
    }

    const baselineCac = baseline.results.cac;
    if (
      baselineCac == null ||
      input.marketingSpendPerPeriod == null ||
      input.newCustomersPerPeriod <= 0
    ) {
      throw new Error("Derived CAC lever requires baseline CAC, spend, and new customers.");
    }
    const scenarioCac = Math.max(0, applyChange(baselineCac, mode, amount));
    const scenarioSpend = scenarioCac * input.newCustomersPerPeriod;
    return {
      fieldPath: "marketingSpendPerPeriod",
      baselineValue: baselineCac,
      scenarioValue: scenarioCac,
      rationale:
        "Adjusted CAC by changing marketingSpendPerPeriod while holding newCustomersPerPeriod constant.",
      apply: (next) => ({
        ...cloneInput(next),
        marketingSpendPerPeriod: scenarioSpend,
      }),
    };
  }

  if (lever === "churn") {
    const recurring = ensureRecurring(input, lever);
    const baselineValue = baseline.results.churnRate;
    if (baselineValue == null) {
      throw new Error("Churn lever requires a recurring baseline churn rate.");
    }
    const scenarioValue = clamp(applyChange(baselineValue, mode, amount), 0, 1);

    if ((recurring.retentionInputMode ?? "counts") === "rate") {
      return {
        fieldPath: "directChurnRatePerPeriod",
        baselineValue,
        scenarioValue,
        rationale: "Adjusted direct churn rate.",
        apply: (next) => ({
          ...cloneInput(next),
          directChurnRatePerPeriod: scenarioValue,
        }),
      };
    }

    const start = recurring.activeCustomersStart;
    if (start == null) {
      throw new Error("Count-based churn lever requires activeCustomersStart.");
    }
    const churnField = resolveRecurringChurnField(recurring);

    if (churnField === "retainedCustomersFromStartAtEnd") {
      const retained = start * (1 - scenarioValue);
      return {
        fieldPath: "retainedCustomersFromStartAtEnd",
        baselineValue,
        scenarioValue,
        rationale:
          "Adjusted churn by synthesizing a retained cohort count from the baseline active customer base.",
        apply: (next) => ({
          ...cloneInput(next),
          retainedCustomersFromStartAtEnd: retained,
          churnedCustomersPerPeriod: undefined,
        }),
      };
    }

    const churned = start * scenarioValue;
    return {
      fieldPath: "churnedCustomersPerPeriod",
      baselineValue,
      scenarioValue,
      rationale:
        "Adjusted churn by synthesizing a churned cohort count from the baseline active customer base.",
      apply: (next) => ({
        ...cloneInput(next),
        churnedCustomersPerPeriod: churned,
        retainedCustomersFromStartAtEnd: undefined,
      }),
    };
  }

  if (lever === "gross_margin") {
    if (input.offerType === "software_subscription") {
      if ((input.grossProfitInputMode ?? "margin") !== "margin" || input.grossMargin == null) {
        throw new Error("Gross margin lever requires margin-based recurring subscription inputs.");
      }
      const scenarioValue = clamp(applyChange(input.grossMargin, mode, amount), 0, 1);
      return {
        fieldPath: "grossMargin",
        baselineValue: input.grossMargin,
        scenarioValue,
        rationale: "Adjusted recurring subscription gross margin.",
        apply: (next) => ({ ...cloneInput(next), grossMargin: scenarioValue }),
      };
    }

    if (input.offerType === "software_paid_pilot") {
      if (input.pilotGrossMargin == null) {
        throw new Error("Gross margin lever requires pilotGrossMargin.");
      }
      const scenarioValue = clamp(applyChange(input.pilotGrossMargin, mode, amount), 0, 1);
      return {
        fieldPath: "pilotGrossMargin",
        baselineValue: input.pilotGrossMargin,
        scenarioValue,
        rationale: "Adjusted pilot gross margin.",
        apply: (next) => ({ ...cloneInput(next), pilotGrossMargin: scenarioValue }),
      };
    }

    if (input.offerType === "software_implementation_plus_subscription") {
      if ((input.grossProfitInputMode ?? "margin") !== "margin" || input.grossMargin == null) {
        throw new Error("Gross margin lever requires margin-based recurring subscription inputs.");
      }
      const scenarioValue = clamp(applyChange(input.grossMargin, mode, amount), 0, 1);
      return {
        fieldPath: "grossMargin",
        baselineValue: input.grossMargin,
        scenarioValue,
        rationale: "Adjusted recurring subscription gross margin for the mixed offer.",
        apply: (next) => ({ ...cloneInput(next), grossMargin: scenarioValue }),
      };
    }

    throw new Error(`Lever '${lever}' is not supported for ${input.offerType}.`);
  }

  if (lever === "price") {
    if (input.offerType === "software_subscription") {
      if ((input.revenueInputMode ?? "total_revenue") !== "direct_arpc" || input.directArpc == null) {
        throw new Error("Price lever requires direct ARPC mode for software subscriptions.");
      }
      const scenarioValue = Math.max(0, applyChange(input.directArpc, mode, amount));
      return {
        fieldPath: "directArpc",
        baselineValue: input.directArpc,
        scenarioValue,
        rationale: "Adjusted recurring price by changing direct ARPC.",
        apply: (next) => ({ ...cloneInput(next), directArpc: scenarioValue }),
      };
    }

    if (input.offerType === "software_paid_pilot") {
      const scenarioValue = Math.max(
        0,
        applyChange(input.pilotFeePerNewCustomer, mode, amount),
      );
      return {
        fieldPath: "pilotFeePerNewCustomer",
        baselineValue: input.pilotFeePerNewCustomer,
        scenarioValue,
        rationale: "Adjusted pilot price by changing pilotFeePerNewCustomer.",
        apply: (next) => ({
          ...cloneInput(next),
          pilotFeePerNewCustomer: scenarioValue,
        }),
      };
    }

    if (input.offerType === "software_token_pricing") {
      const scenarioValue = Math.max(
        0,
        applyChange(input.pricePerUsageUnit, mode, amount),
      );
      return {
        fieldPath: "pricePerUsageUnit",
        baselineValue: input.pricePerUsageUnit,
        scenarioValue,
        rationale: "Adjusted token price by changing pricePerUsageUnit.",
        apply: (next) => ({ ...cloneInput(next), pricePerUsageUnit: scenarioValue }),
      };
    }

    throw new Error(`Lever '${lever}' is not supported for ${input.offerType}.`);
  }

  if (lever === "platform_price") {
    if (input.offerType !== "software_hybrid_platform_usage") {
      throw new Error(`Lever '${lever}' is not supported for ${input.offerType}.`);
    }
    const scenarioValue = Math.max(
      0,
      applyChange(input.platformFeePerCustomerPerPeriod, mode, amount),
    );
    return {
      fieldPath: "platformFeePerCustomerPerPeriod",
      baselineValue: input.platformFeePerCustomerPerPeriod,
      scenarioValue,
      rationale: "Adjusted the base platform fee portion of hybrid pricing.",
      apply: (next) => ({
        ...cloneInput(next as SoftwareHybridPlatformUsageInput),
        platformFeePerCustomerPerPeriod: scenarioValue,
      }),
    };
  }

  if (lever === "usage_price") {
    if (input.offerType !== "software_hybrid_platform_usage") {
      throw new Error(`Lever '${lever}' is not supported for ${input.offerType}.`);
    }
    const scenarioValue = Math.max(
      0,
      applyChange(input.pricePerUsageUnit, mode, amount),
    );
    return {
      fieldPath: "pricePerUsageUnit",
      baselineValue: input.pricePerUsageUnit,
      scenarioValue,
      rationale: "Adjusted the usage-price portion of hybrid pricing.",
      apply: (next) => ({
        ...cloneInput(next as SoftwareHybridPlatformUsageInput),
        pricePerUsageUnit: scenarioValue,
      }),
    };
  }

  if (lever === "subscription_price") {
    if (input.offerType !== "software_implementation_plus_subscription") {
      throw new Error(`Lever '${lever}' is not supported for ${input.offerType}.`);
    }
    const scenarioValue = Math.max(0, applyChange(input.directArpc, mode, amount));
    return {
      fieldPath: "directArpc",
      baselineValue: input.directArpc,
      scenarioValue,
      rationale: "Adjusted the recurring subscription price portion of the mixed offer.",
      apply: (next) => ({
        ...cloneInput(next as SoftwareImplementationPlusSubscriptionInput),
        directArpc: scenarioValue,
      }),
    };
  }

  if (lever === "implementation_price") {
    if (input.offerType !== "software_implementation_plus_subscription") {
      throw new Error(`Lever '${lever}' is not supported for ${input.offerType}.`);
    }
    const scenarioValue = Math.max(
      0,
      applyChange(input.implementationFeePerNewCustomer, mode, amount),
    );
    return {
      fieldPath: "implementationFeePerNewCustomer",
      baselineValue: input.implementationFeePerNewCustomer,
      scenarioValue,
      rationale: "Adjusted the upfront implementation fee portion of the mixed offer.",
      apply: (next) => ({
        ...cloneInput(next as SoftwareImplementationPlusSubscriptionInput),
        implementationFeePerNewCustomer: scenarioValue,
      }),
    };
  }

  throw new Error(`Unsupported analysis lever '${lever}'.`);
};

export const createAnalysisBaselineSnapshot = (
  evaluation: KpiEvaluation,
  generatedAt = new Date().toISOString(),
): AnalysisBaselineSnapshot => {
  if (!("offerType" in evaluation.inputs) || !isSupportedAnalysisInput(evaluation.inputs)) {
    throw new Error("Analysis baseline requires a supported software offer input.");
  }

  return {
    generatedAt,
    offerType: evaluation.inputs.offerType,
    offerId: evaluation.inputs.offerId,
    offerName: evaluation.inputs.offerName,
    analysisPeriod: evaluation.inputs.analysisPeriod,
    calculationVersion: evaluation.calculationVersion,
    inputs: cloneInput(evaluation.inputs),
    results: structuredClone(evaluation.results),
    warnings: [...evaluation.warnings],
    assumptionsApplied: [...evaluation.assumptionsApplied],
  };
};

export const createScenarioDefinition = ({
  baseline,
  lever,
  mode,
  amount,
}: {
  baseline: AnalysisBaselineSnapshot;
  lever: AnalysisLever;
  mode: ScenarioChangeMode;
  amount: number;
}): ScenarioDefinition => {
  const plan = buildScenarioPlan(baseline, lever, mode, amount);
  const direction = amount >= 0 ? "increase" : "decrease";
  const amountLabel =
    mode === "percent" ? formatPercentChangeLabel(amount) : formatAbsoluteLabel(amount);
  return {
    id: buildScenarioId(baseline, lever, mode, amount),
    lever,
    label: `${direction === "increase" ? "Increase" : "Decrease"} ${lever.replaceAll("_", " ")} by ${amountLabel}`,
    mode,
    amount,
    direction,
    fieldPath: plan.fieldPath,
    baselineValue: plan.baselineValue,
    scenarioValue: plan.scenarioValue,
    rationale: plan.rationale,
  };
};

export const buildMetricDeltas = (
  baselineResults: KPIResult,
  scenarioResults: KPIResult | null,
): MetricDelta[] => {
  return metricKeys.map((metric) => {
    const baselineValue = metricValue(baselineResults, metric);
    const scenarioValue = scenarioResults == null ? null : metricValue(scenarioResults, metric);
    const absoluteDelta =
      baselineValue == null || scenarioValue == null ? null : scenarioValue - baselineValue;
    const percentDelta =
      baselineValue == null ||
      scenarioValue == null ||
      baselineValue === 0
        ? null
        : (scenarioValue - baselineValue) / baselineValue;
    return {
      metric,
      baseline: baselineValue,
      scenario: scenarioValue,
      absoluteDelta,
      percentDelta,
    };
  });
};

const deltaForMetric = (
  deltas: MetricDelta[],
  metric: KpiMetricKey,
) => deltas.find((delta) => delta.metric === metric);

export const evaluateScenario = ({
  baseline,
  scenario,
  targetMetric = defaultTargetMetric,
}: {
  baseline: AnalysisBaselineSnapshot;
  scenario: ScenarioDefinition;
  targetMetric?: KpiMetricKey;
}): ScenarioEvaluation => {
  let patchedInput: SupportedAnalysisInput | null = null;
  let results: KPIResult | null = null;
  let warnings: string[] = [];
  let assumptionsApplied: string[] = [];
  let valid = false;
  let invalidReason: string | undefined;

  try {
    const plan = buildScenarioPlan(
      baseline,
      scenario.lever,
      scenario.mode,
      scenario.amount,
    );
    patchedInput = plan.apply(cloneInput(baseline.inputs));
    const evaluation = evaluateKpis(patchedInput);
    if (!("offerType" in evaluation.inputs) || !isSupportedAnalysisInput(evaluation.inputs)) {
      throw new Error("Scenario evaluation returned an unsupported input shape.");
    }
    patchedInput = cloneInput(evaluation.inputs);
    results = structuredClone(evaluation.results);
    warnings = [...evaluation.warnings];
    assumptionsApplied = [...evaluation.assumptionsApplied];
    valid = true;
  } catch (error) {
    invalidReason = error instanceof Error ? error.message : "Unknown scenario error.";
  }

  const metricDeltas = buildMetricDeltas(baseline.results, results);
  const primaryDelta = deltaForMetric(metricDeltas, targetMetric);

  return {
    scenario,
    valid,
    invalidReason,
    inputs: patchedInput,
    results,
    warnings,
    assumptionsApplied,
    metricDeltas,
    primaryOutcome: {
      metric: targetMetric,
      baseline: primaryDelta?.baseline ?? null,
      scenario: primaryDelta?.scenario ?? null,
      absoluteDelta: primaryDelta?.absoluteDelta ?? null,
      percentDelta: primaryDelta?.percentDelta ?? null,
    },
  };
};

export const buildSensitivitySweep = ({
  baseline,
  lever,
  targetMetric = defaultTargetMetric,
  mode = "percent",
  steps,
}: {
  baseline: AnalysisBaselineSnapshot;
  lever: AnalysisLever;
  targetMetric?: KpiMetricKey;
  mode?: ScenarioChangeMode;
  steps: number[];
}): SensitivitySweep => {
  const scenarios = steps.map((amount) =>
    evaluateScenario({
      baseline,
      scenario: createScenarioDefinition({ baseline, lever, mode, amount }),
      targetMetric,
    }),
  );

  return {
    lever,
    targetMetric,
    mode,
    steps,
    scenarios,
  };
};

const buildOpportunityScore = (
  scenario: ScenarioEvaluation,
  targetMetric: KpiMetricKey,
): OpportunityScore => {
  const delta = scenario.primaryOutcome;
  const betterDirection = betterDirectionForMetric(targetMetric);
  const baseScore =
    delta.percentDelta != null ? delta.percentDelta : delta.absoluteDelta;
  const normalizedScore =
    baseScore == null
      ? null
      : betterDirection === "higher"
        ? baseScore
        : -baseScore;

  return {
    targetMetric,
    baseline: delta.baseline,
    scenario: delta.scenario,
    absoluteDelta: delta.absoluteDelta,
    percentDelta: delta.percentDelta,
    betterDirection,
    normalizedScore,
  };
};

const determineConfidence = (scenario: ScenarioEvaluation): "high" | "medium" | "low" => {
  if (scenario.warnings.length === 0 && !isCountSynthesizedField(scenario.scenario.fieldPath)) {
    return "high";
  }
  if (scenario.warnings.length <= 1) {
    return "medium";
  }
  return "low";
};

const keyDeltaMetrics = (targetMetric: KpiMetricKey): KpiMetricKey[] => {
  const defaultMetrics: KpiMetricKey[] = [
    targetMetric,
    "ltgpToCacRatio",
    "cacPaybackPeriods",
    "projectedProfitNextYear",
  ];
  return [...new Set(defaultMetrics)];
};

export const rankScenarioEvaluations = ({
  scenarios,
  targetMetric = defaultTargetMetric,
}: {
  scenarios: ScenarioEvaluation[];
  targetMetric?: KpiMetricKey;
}): RankedOpportunity[] => {
  const ranked = scenarios
    .filter((scenario) => scenario.valid)
    .map((scenario) => {
      const score = buildOpportunityScore(scenario, targetMetric);
      const keyDeltas = keyDeltaMetrics(targetMetric)
        .map((metric) => deltaForMetric(scenario.metricDeltas, metric))
        .filter((delta): delta is MetricDelta => delta != null);
      const absoluteDisplay =
        score.absoluteDelta == null ? "n/a" : score.absoluteDelta.toFixed(2);
      return {
        rank: 0,
        scenarioId: scenario.scenario.id,
        lever: scenario.scenario.lever,
        label: scenario.scenario.label,
        summary: `${scenario.scenario.label} changes ${targetMetric} by ${absoluteDisplay}.`,
        scenario: scenario.scenario,
        score,
        keyDeltas,
        warnings: [...scenario.warnings],
        confidence: determineConfidence(scenario),
      };
    })
    .sort((left, right) => {
      const leftScore = left.score.normalizedScore ?? Number.NEGATIVE_INFINITY;
      const rightScore = right.score.normalizedScore ?? Number.NEGATIVE_INFINITY;
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }

      const leftAbs = Math.abs(left.score.absoluteDelta ?? Number.NEGATIVE_INFINITY);
      const rightAbs = Math.abs(right.score.absoluteDelta ?? Number.NEGATIVE_INFINITY);
      if (rightAbs !== leftAbs) {
        return rightAbs - leftAbs;
      }

      const leftPct = Math.abs(left.score.percentDelta ?? Number.NEGATIVE_INFINITY);
      const rightPct = Math.abs(right.score.percentDelta ?? Number.NEGATIVE_INFINITY);
      if (rightPct !== leftPct) {
        return rightPct - leftPct;
      }

      return left.label.localeCompare(right.label);
    })
    .map((opportunity, index) => ({
      ...opportunity,
      rank: index + 1,
    }));

  return ranked;
};

export const buildAnalysisReport = ({
  evaluation,
  targetMetric = defaultTargetMetric,
  mode = "percent",
}: {
  evaluation: KpiEvaluation;
  targetMetric?: KpiMetricKey;
  mode?: ScenarioChangeMode;
}): AnalysisReport => {
  const baseline = createAnalysisBaselineSnapshot(evaluation);
  const levers = getApplicableLevers(baseline.inputs);
  const sweeps = levers.map((lever) =>
    buildSensitivitySweep({
      baseline,
      lever,
      targetMetric,
      mode,
      steps: beneficialPercentStepsByLever[lever],
    }),
  );
  const generatedScenarios = sweeps.flatMap((sweep) => sweep.scenarios);
  const rankedOpportunities = rankScenarioEvaluations({
    scenarios: generatedScenarios,
    targetMetric,
  });

  return {
    version: "analysis-v1",
    baseline,
    targetMetric,
    generatedScenarios,
    sweeps,
    rankedOpportunities,
    bestOpportunity: rankedOpportunities[0] ?? null,
  };
};

export const getApplicableAnalysisLevers = (input: SupportedAnalysisInput) =>
  getApplicableLevers(input);

export const buildAnalysisExport = ({
  report,
  exportSource,
  exportedAt = new Date().toISOString(),
}: {
  report: AnalysisReport;
  exportSource: AnalysisExportSource;
  exportedAt?: string;
}): AnalysisExport => {
  return {
    version: "analysis-export-v1",
    baseline: structuredClone(report.baseline),
    report: structuredClone(report),
    exportMetadata: {
      exportedAt,
      exportSource,
      schemaVersion: "analysis-export-v1",
    },
  };
};

export const buildAnalysisScenarioRows = (
  report: AnalysisReport,
): AnalysisScenarioRow[] => {
  const rankingByScenarioId = new Map(
    report.rankedOpportunities.map((opportunity) => [
      opportunity.scenarioId,
      opportunity,
    ]),
  );

  return report.generatedScenarios.map<AnalysisScenarioRow>((scenario) => {
    const ranked = rankingByScenarioId.get(scenario.scenario.id);
    const deltas = deltaLookup(scenario.metricDeltas);
    const metric = (key: KpiMetricKey) => deltas.get(key);

    return {
      baselineOfferId: report.baseline.offerId,
      baselineOfferName: report.baseline.offerName,
      baselineOfferType: report.baseline.offerType,
      analysisPeriod: report.baseline.analysisPeriod,
      calculationVersion: report.baseline.calculationVersion,

      targetMetric: report.targetMetric,
      scenarioId: scenario.scenario.id,
      lever: scenario.scenario.lever,
      label: scenario.scenario.label,
      mode: scenario.scenario.mode,
      direction: scenario.scenario.direction,
      amount: scenario.scenario.amount,
      fieldPath: scenario.scenario.fieldPath,
      baselineValue: scenario.scenario.baselineValue,
      scenarioValue: scenario.scenario.scenarioValue,
      valid: scenario.valid,
      invalidReason: scenario.invalidReason ?? null,

      baseline_cac: metric("cac")?.baseline ?? null,
      scenario_cac: metric("cac")?.scenario ?? null,
      delta_cac_absolute: metric("cac")?.absoluteDelta ?? null,
      delta_cac_percent: metric("cac")?.percentDelta ?? null,

      baseline_arpc: metric("arpc")?.baseline ?? null,
      scenario_arpc: metric("arpc")?.scenario ?? null,
      delta_arpc_absolute: metric("arpc")?.absoluteDelta ?? null,
      delta_arpc_percent: metric("arpc")?.percentDelta ?? null,

      baseline_churnRate: metric("churnRate")?.baseline ?? null,
      scenario_churnRate: metric("churnRate")?.scenario ?? null,
      delta_churnRate_absolute: metric("churnRate")?.absoluteDelta ?? null,
      delta_churnRate_percent: metric("churnRate")?.percentDelta ?? null,

      baseline_retentionRate: metric("retentionRate")?.baseline ?? null,
      scenario_retentionRate: metric("retentionRate")?.scenario ?? null,
      delta_retentionRate_absolute: metric("retentionRate")?.absoluteDelta ?? null,
      delta_retentionRate_percent: metric("retentionRate")?.percentDelta ?? null,

      baseline_ltv: metric("ltv")?.baseline ?? null,
      scenario_ltv: metric("ltv")?.scenario ?? null,
      delta_ltv_absolute: metric("ltv")?.absoluteDelta ?? null,
      delta_ltv_percent: metric("ltv")?.percentDelta ?? null,

      baseline_ltgpPerCustomer: metric("ltgpPerCustomer")?.baseline ?? null,
      scenario_ltgpPerCustomer: metric("ltgpPerCustomer")?.scenario ?? null,
      delta_ltgpPerCustomer_absolute:
        metric("ltgpPerCustomer")?.absoluteDelta ?? null,
      delta_ltgpPerCustomer_percent:
        metric("ltgpPerCustomer")?.percentDelta ?? null,

      baseline_ltgpToCacRatio: metric("ltgpToCacRatio")?.baseline ?? null,
      scenario_ltgpToCacRatio: metric("ltgpToCacRatio")?.scenario ?? null,
      delta_ltgpToCacRatio_absolute:
        metric("ltgpToCacRatio")?.absoluteDelta ?? null,
      delta_ltgpToCacRatio_percent:
        metric("ltgpToCacRatio")?.percentDelta ?? null,

      baseline_cacPaybackPeriods: metric("cacPaybackPeriods")?.baseline ?? null,
      scenario_cacPaybackPeriods: metric("cacPaybackPeriods")?.scenario ?? null,
      delta_cacPaybackPeriods_absolute:
        metric("cacPaybackPeriods")?.absoluteDelta ?? null,
      delta_cacPaybackPeriods_percent:
        metric("cacPaybackPeriods")?.percentDelta ?? null,

      baseline_hypotheticalMaxCustomers:
        metric("hypotheticalMaxCustomers")?.baseline ?? null,
      scenario_hypotheticalMaxCustomers:
        metric("hypotheticalMaxCustomers")?.scenario ?? null,
      delta_hypotheticalMaxCustomers_absolute:
        metric("hypotheticalMaxCustomers")?.absoluteDelta ?? null,
      delta_hypotheticalMaxCustomers_percent:
        metric("hypotheticalMaxCustomers")?.percentDelta ?? null,

      baseline_hypotheticalMaxRevenuePerYear:
        metric("hypotheticalMaxRevenuePerYear")?.baseline ?? null,
      scenario_hypotheticalMaxRevenuePerYear:
        metric("hypotheticalMaxRevenuePerYear")?.scenario ?? null,
      delta_hypotheticalMaxRevenuePerYear_absolute:
        metric("hypotheticalMaxRevenuePerYear")?.absoluteDelta ?? null,
      delta_hypotheticalMaxRevenuePerYear_percent:
        metric("hypotheticalMaxRevenuePerYear")?.percentDelta ?? null,

      baseline_hypotheticalMaxProfitPerYear:
        metric("hypotheticalMaxProfitPerYear")?.baseline ?? null,
      scenario_hypotheticalMaxProfitPerYear:
        metric("hypotheticalMaxProfitPerYear")?.scenario ?? null,
      delta_hypotheticalMaxProfitPerYear_absolute:
        metric("hypotheticalMaxProfitPerYear")?.absoluteDelta ?? null,
      delta_hypotheticalMaxProfitPerYear_percent:
        metric("hypotheticalMaxProfitPerYear")?.percentDelta ?? null,

      baseline_projectedRevenueNextYear:
        metric("projectedRevenueNextYear")?.baseline ?? null,
      scenario_projectedRevenueNextYear:
        metric("projectedRevenueNextYear")?.scenario ?? null,
      delta_projectedRevenueNextYear_absolute:
        metric("projectedRevenueNextYear")?.absoluteDelta ?? null,
      delta_projectedRevenueNextYear_percent:
        metric("projectedRevenueNextYear")?.percentDelta ?? null,

      baseline_projectedProfitNextYear:
        metric("projectedProfitNextYear")?.baseline ?? null,
      scenario_projectedProfitNextYear:
        metric("projectedProfitNextYear")?.scenario ?? null,
      delta_projectedProfitNextYear_absolute:
        metric("projectedProfitNextYear")?.absoluteDelta ?? null,
      delta_projectedProfitNextYear_percent:
        metric("projectedProfitNextYear")?.percentDelta ?? null,

      baseline_car: metric("car")?.baseline ?? null,
      scenario_car: metric("car")?.scenario ?? null,
      delta_car_absolute: metric("car")?.absoluteDelta ?? null,
      delta_car_percent: metric("car")?.percentDelta ?? null,

      rank: ranked?.rank ?? null,
      score: ranked?.score.normalizedScore ?? null,
      confidence: ranked?.confidence ?? null,
      warnings: scenario.warnings.join(" | "),
      assumptionsApplied: scenario.assumptionsApplied.join(" | "),
    };
  });
};
