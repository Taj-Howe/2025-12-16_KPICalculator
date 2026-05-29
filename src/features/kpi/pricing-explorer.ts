import { monthlySalesVelocity } from "./formulas";
import { evaluateKpis } from "./service";
import type {
  KpiEvaluation,
  KPIResult,
  SoftwareHybridPlatformUsageInput,
  SoftwareImplementationPlusSubscriptionInput,
  SoftwareTokenPricingInput,
  SubscriptionOfferInput,
} from "./types";

export type PricingSensitivityPreset = "low" | "base" | "high" | "manual";

export type PricingSensitivityAssumptions = {
  preset: PricingSensitivityPreset;
  churnPpPer10PctPriceChange: number;
  salesVelocityPctPer10PctPriceChange: number;
};

export type PricingScenarioVerdict =
  | "baseline"
  | "best_under_assumptions"
  | "works_under_assumptions"
  | "fragile_gain"
  | "worse_than_baseline"
  | "incomplete";

export type PricingScenarioResult = {
  id: string;
  priceDelta: number;
  priceDeltaSteps: number;
  isBaseline: boolean;
  isBest: boolean;
  price: number;
  newCustomersPerPeriod: number;
  salesVelocityPerMonth: number | null;
  churnRate: number;
  breakEvenChurnRate: number | null;
  recurringGrossProfitPerCustomer: number | null;
  projectedProfitDelta: number | null;
  ltgpToCacDelta: number | null;
  cacPaybackDelta: number | null;
  verdict: PricingScenarioVerdict;
  inputs: EligiblePricingInput;
  results: KPIResult;
  warnings: string[];
};

export type PricingExplorerReport = {
  eligible: boolean;
  ineligibleReason: string | null;
  assumptions: PricingSensitivityAssumptions;
  grossProfitAssumption: string | null;
  baseline: {
    price: number | null;
    churnRate: number | null;
    newCustomersPerPeriod: number | null;
    salesVelocityPerMonth: number | null;
    recurringGrossProfitPerCustomer: number | null;
    projectedProfitNextYear: number | null;
  };
  scenarios: PricingScenarioResult[];
  bestScenario: PricingScenarioResult | null;
};

type EligiblePricingInput =
  | SubscriptionOfferInput
  | SoftwareTokenPricingInput
  | SoftwareHybridPlatformUsageInput
  | SoftwareImplementationPlusSubscriptionInput;

type PriceConfig = {
  fieldPath: string;
  baselinePrice: number | null;
  applyPrice: (input: EligiblePricingInput, price: number) => EligiblePricingInput;
  grossProfitAssumption: string;
};

const pricingDeltas = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3];

export const pricingSensitivityPresets: Record<
  Exclude<PricingSensitivityPreset, "manual">,
  PricingSensitivityAssumptions
> = {
  low: {
    preset: "low",
    churnPpPer10PctPriceChange: 0.0025,
    salesVelocityPctPer10PctPriceChange: -0.025,
  },
  base: {
    preset: "base",
    churnPpPer10PctPriceChange: 0.005,
    salesVelocityPctPer10PctPriceChange: -0.05,
  },
  high: {
    preset: "high",
    churnPpPer10PctPriceChange: 0.01,
    salesVelocityPctPer10PctPriceChange: -0.1,
  },
};

export const defaultPricingSensitivityAssumptions =
  pricingSensitivityPresets.base;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const cloneInput = <T>(input: T): T => structuredClone(input);

const isEligibleOfferInput = (
  input: KpiEvaluation["inputs"],
): input is EligiblePricingInput =>
  input != null &&
  "offerType" in input &&
  (input.offerType === "software_subscription" ||
    input.offerType === "software_token_pricing" ||
    input.offerType === "software_hybrid_platform_usage" ||
    input.offerType === "software_implementation_plus_subscription");

const priceConfigFor = (input: EligiblePricingInput): PriceConfig => {
  if (input.offerType === "software_subscription") {
    return {
      fieldPath: "directArpc",
      baselinePrice:
        (input.revenueInputMode ?? "total_revenue") === "direct_arpc"
          ? input.directArpc ?? null
          : null,
      applyPrice: (next, price) => ({
        ...cloneInput(next as SubscriptionOfferInput),
        directArpc: price,
      }),
      grossProfitAssumption:
        (input.grossProfitInputMode ?? "margin") === "margin"
          ? "Gross margin percentage is held constant as price changes."
          : "Delivery costs are held fixed as price changes.",
    };
  }

  if (input.offerType === "software_token_pricing") {
    return {
      fieldPath: "pricePerUsageUnit",
      baselinePrice: input.pricePerUsageUnit,
      applyPrice: (next, price) => ({
        ...cloneInput(next as SoftwareTokenPricingInput),
        pricePerUsageUnit: price,
      }),
      grossProfitAssumption: "Usage costs are held fixed as price changes.",
    };
  }

  if (input.offerType === "software_hybrid_platform_usage") {
    return {
      fieldPath: "platformFeePerCustomerPerPeriod",
      baselinePrice: input.platformFeePerCustomerPerPeriod,
      applyPrice: (next, price) => ({
        ...cloneInput(next as SoftwareHybridPlatformUsageInput),
        platformFeePerCustomerPerPeriod: price,
      }),
      grossProfitAssumption:
        "Platform and usage delivery costs are held fixed as platform price changes.",
    };
  }

  return {
    fieldPath: "directArpc",
    baselinePrice: input.directArpc ?? null,
    applyPrice: (next, price) => ({
      ...cloneInput(next as SoftwareImplementationPlusSubscriptionInput),
      directArpc: price,
    }),
    grossProfitAssumption:
      (input.grossProfitInputMode ?? "margin") === "margin"
        ? "Recurring gross margin percentage is held constant; implementation economics are unchanged."
        : "Recurring delivery costs are held fixed; implementation economics are unchanged.",
  };
};

const activeCustomerAverage = (input: EligiblePricingInput, churnRate: number) => {
  const start = input.activeCustomersStart ?? 0;
  const churned = start * churnRate;
  const end = start + input.newCustomersPerPeriod - churned;
  return (start + end) / 2;
};

const recurringGrossProfitPerCustomer = (
  input: EligiblePricingInput,
  results: KPIResult,
): number | null => {
  if (input.offerType === "software_implementation_plus_subscription") {
    if ((input.grossProfitInputMode ?? "margin") === "margin") {
      return input.grossMargin == null ? null : input.directArpc * input.grossMargin;
    }
    const churn = results.churnRate ?? 0;
    const avgCustomers = activeCustomerAverage(input, churn);
    const fixedCostShare =
      avgCustomers > 0 ? (input.fixedDeliveryCostPerPeriod ?? 0) / avgCustomers : 0;
    return (
      input.directArpc -
      (input.deliveryCostPerCustomerPerPeriod ?? 0) -
      fixedCostShare
    );
  }

  if (results.ltgpPerCustomer == null || results.churnRate == null) {
    return null;
  }
  return results.ltgpPerCustomer * results.churnRate;
};

const patchChurn = <TInput extends EligiblePricingInput>(
  input: TInput,
  churnRate: number,
): TInput => {
  if ((input.retentionInputMode ?? "counts") === "rate") {
    return {
      ...cloneInput(input),
      directChurnRatePerPeriod: churnRate,
    };
  }

  const start = input.activeCustomersStart ?? 0;
  if (
    input.churnedCustomersPerPeriod != null &&
    input.retainedCustomersFromStartAtEnd == null
  ) {
    return {
      ...cloneInput(input),
      churnedCustomersPerPeriod: start * churnRate,
      retainedCustomersFromStartAtEnd: undefined,
    };
  }

  return {
    ...cloneInput(input),
    retainedCustomersFromStartAtEnd: start * (1 - churnRate),
    churnedCustomersPerPeriod: undefined,
  };
};

const patchNewCustomers = <TInput extends EligiblePricingInput>(
  input: TInput,
  newCustomersPerPeriod: number,
): TInput => ({
  ...cloneInput(input),
  newCustomersPerPeriod,
});

const buildIneligibleReport = ({
  assumptions,
  reason,
  evaluation,
}: {
  assumptions: PricingSensitivityAssumptions;
  reason: string;
  evaluation: KpiEvaluation;
}): PricingExplorerReport => ({
  eligible: false,
  ineligibleReason: reason,
  assumptions,
  grossProfitAssumption: null,
  baseline: {
    price: null,
    churnRate: evaluation.results.churnRate ?? null,
    newCustomersPerPeriod:
      "newCustomersPerPeriod" in evaluation.inputs
        ? evaluation.inputs.newCustomersPerPeriod ?? null
        : null,
    salesVelocityPerMonth:
      "newCustomersPerPeriod" in evaluation.inputs && "analysisPeriod" in evaluation.inputs
        ? monthlySalesVelocity(
            evaluation.inputs.newCustomersPerPeriod,
            evaluation.inputs.analysisPeriod,
          )
        : null,
    recurringGrossProfitPerCustomer: null,
    projectedProfitNextYear: evaluation.results.projectedProfitNextYear,
  },
  scenarios: [],
  bestScenario: null,
});

const verdictFor = ({
  scenario,
  baselineProfit,
  isBest,
}: {
  scenario: Omit<PricingScenarioResult, "verdict" | "isBest">;
  baselineProfit: number | null;
  isBest: boolean;
}): PricingScenarioVerdict => {
  if (scenario.isBaseline) {
    return "baseline";
  }
  if (scenario.results.projectedProfitNextYear == null || baselineProfit == null) {
    return "incomplete";
  }
  if (scenario.results.projectedProfitNextYear < baselineProfit) {
    return "worse_than_baseline";
  }
  if (isBest) {
    return "best_under_assumptions";
  }
  if (
    scenario.priceDelta > 0 &&
    scenario.breakEvenChurnRate != null &&
    scenario.churnRate > scenario.breakEvenChurnRate * 0.9
  ) {
    return "fragile_gain";
  }
  return "works_under_assumptions";
};

export const buildPricingExplorerReport = ({
  evaluation,
  assumptions = defaultPricingSensitivityAssumptions,
}: {
  evaluation: KpiEvaluation;
  assumptions?: PricingSensitivityAssumptions;
}): PricingExplorerReport => {
  if (!isEligibleOfferInput(evaluation.inputs)) {
    const reason =
      "offerType" in evaluation.inputs &&
      evaluation.inputs.offerType === "software_paid_pilot"
        ? "Paid pilots are one-time throughput offers, so churn tradeoff pricing is not available."
        : "Pricing Explorer is available for recurring software offers only.";
    return buildIneligibleReport({ assumptions, reason, evaluation });
  }

  const baselineInput = cloneInput(evaluation.inputs);
  const priceConfig = priceConfigFor(baselineInput);
  const baselinePrice = priceConfig.baselinePrice;
  if (baselinePrice == null || baselinePrice <= 0) {
    const reason =
      baselineInput.offerType === "software_subscription"
        ? "Use direct ARPC mode before comparing price points."
        : "A positive baseline price is required before comparing price points.";
    return buildIneligibleReport({ assumptions, reason, evaluation });
  }

  const baselineChurn = evaluation.results.churnRate;
  if (baselineChurn == null) {
    return buildIneligibleReport({
      assumptions,
      reason: "A baseline churn rate is required before comparing pricing tradeoffs.",
      evaluation,
    });
  }

  if (baselineInput.activeCustomersStart == null) {
    return buildIneligibleReport({
      assumptions,
      reason:
        "A starting active customer base is required before comparing pricing tradeoffs.",
      evaluation,
    });
  }

  if (baselineInput.newCustomersPerPeriod <= 0) {
    return buildIneligibleReport({
      assumptions,
      reason:
        "A positive sales velocity is required before comparing pricing tradeoffs.",
      evaluation,
    });
  }

  const baselineGrossProfit = recurringGrossProfitPerCustomer(
    baselineInput,
    evaluation.results,
  );
  if (baselineGrossProfit == null || baselineGrossProfit <= 0) {
    return buildIneligibleReport({
      assumptions,
      reason:
        "Positive recurring gross profit per customer is required before comparing pricing tradeoffs.",
      evaluation,
    });
  }

  const baselineProfit = evaluation.results.projectedProfitNextYear;

  const provisionalScenarios = pricingDeltas.map((priceDelta) => {
    const priceDeltaSteps = priceDelta / 0.1;
    const scenarioPrice = Math.max(0, baselinePrice * (1 + priceDelta));
    const scenarioChurn = clamp(
      baselineChurn +
        priceDeltaSteps * assumptions.churnPpPer10PctPriceChange,
      0,
      1,
    );
    const scenarioNewCustomers = Math.max(
      0,
      baselineInput.newCustomersPerPeriod *
        (1 +
          priceDeltaSteps *
            assumptions.salesVelocityPctPer10PctPriceChange),
    );

    const pricedInput = priceConfig.applyPrice(baselineInput, scenarioPrice);
    const churnedInput = patchChurn(pricedInput, scenarioChurn);
    const patchedInput = patchNewCustomers(churnedInput, scenarioNewCustomers);
    const scenarioEvaluation = evaluateKpis(patchedInput);
    const inputs = scenarioEvaluation.inputs as EligiblePricingInput;
    const recurringGrossProfit = recurringGrossProfitPerCustomer(
      inputs,
      scenarioEvaluation.results,
    );
    const breakEvenChurnRate =
      recurringGrossProfit == null
        ? null
        : baselineChurn * (recurringGrossProfit / baselineGrossProfit);

    return {
      id: `pricing_${Math.round(priceDelta * 100)}`,
      priceDelta,
      priceDeltaSteps,
      isBaseline: priceDelta === 0,
      price: scenarioPrice,
      newCustomersPerPeriod: scenarioNewCustomers,
      salesVelocityPerMonth: monthlySalesVelocity(
        scenarioNewCustomers,
        inputs.analysisPeriod,
      ),
      churnRate: scenarioChurn,
      breakEvenChurnRate,
      recurringGrossProfitPerCustomer: recurringGrossProfit,
      projectedProfitDelta:
        baselineProfit == null ||
        scenarioEvaluation.results.projectedProfitNextYear == null
          ? null
          : scenarioEvaluation.results.projectedProfitNextYear - baselineProfit,
      ltgpToCacDelta:
        evaluation.results.ltgpToCacRatio == null ||
        scenarioEvaluation.results.ltgpToCacRatio == null
          ? null
          : scenarioEvaluation.results.ltgpToCacRatio -
            evaluation.results.ltgpToCacRatio,
      cacPaybackDelta:
        evaluation.results.cacPaybackPeriods == null ||
        scenarioEvaluation.results.cacPaybackPeriods == null
          ? null
          : scenarioEvaluation.results.cacPaybackPeriods -
            evaluation.results.cacPaybackPeriods,
      inputs,
      results: scenarioEvaluation.results,
      warnings: scenarioEvaluation.warnings,
    } satisfies Omit<PricingScenarioResult, "verdict" | "isBest">;
  });

  const bestProvisional =
    provisionalScenarios
      .filter((scenario) => scenario.results.projectedProfitNextYear != null)
      .sort(
        (left, right) =>
          (right.results.projectedProfitNextYear ?? Number.NEGATIVE_INFINITY) -
          (left.results.projectedProfitNextYear ?? Number.NEGATIVE_INFINITY),
      )[0] ?? null;

  const scenarios = provisionalScenarios.map<PricingScenarioResult>((scenario) => {
    const isBest = scenario.id === bestProvisional?.id;
    return {
      ...scenario,
      isBest,
      verdict: verdictFor({ scenario, baselineProfit, isBest }),
    };
  });

  return {
    eligible: true,
    ineligibleReason: null,
    assumptions,
    grossProfitAssumption: priceConfig.grossProfitAssumption,
    baseline: {
      price: baselinePrice,
      churnRate: baselineChurn,
      newCustomersPerPeriod: baselineInput.newCustomersPerPeriod,
      salesVelocityPerMonth: monthlySalesVelocity(
        baselineInput.newCustomersPerPeriod,
        baselineInput.analysisPeriod,
      ),
      recurringGrossProfitPerCustomer: baselineGrossProfit,
      projectedProfitNextYear: baselineProfit,
    },
    scenarios,
    bestScenario:
      scenarios.find((scenario) => scenario.id === bestProvisional?.id) ?? null,
  };
};

export const priceRecommendationLevers = new Set([
  "price",
  "platform_price",
  "subscription_price",
]);
