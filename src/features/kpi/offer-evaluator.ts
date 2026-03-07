import {
  annualizedProfit,
  annualizedRevenue,
  arpc,
  averageActiveCustomers,
  cac,
  churnRate,
  churnedFromStart,
  ltgpPerCustomer,
  ltvSubscription,
  ratioLtgpToCac,
} from "./formulas";
import type { KPIResult, OfferInput, SubscriptionOfferInput } from "./types";

export type OfferEvaluation = {
  results: KPIResult;
  warnings: string[];
  assumptionsApplied: string[];
  usedFlexibleCostInputs: boolean;
};

export interface OfferEvaluator<TInput extends OfferInput> {
  offerType: TInput["offerType"];
  evaluate: (input: TInput) => OfferEvaluation;
}

export const subscriptionOfferEvaluator: OfferEvaluator<SubscriptionOfferInput> = {
  offerType: "subscription",
  evaluate: (input) => {
    const warnings: string[] = [];
    const assumptionsApplied: string[] = [];
    const revenueInputMode = input.revenueInputMode ?? "total_revenue";
    const grossProfitInputMode = input.grossProfitInputMode ?? "margin";
    const cacInputMode = input.cacInputMode ?? "derived";
    const retentionInputMode = input.retentionInputMode ?? "counts";
    const activeCustomersStart = input.activeCustomersStart ?? null;

    let derivedChurned: number | null = null;
    let churnValue: number | null = null;
    if (retentionInputMode === "rate") {
      churnValue = input.directChurnRatePerPeriod ?? null;
      derivedChurned =
        churnValue != null && activeCustomersStart != null
          ? activeCustomersStart * churnValue
          : null;
      assumptionsApplied.push("Used direct churn rate for subscription retention.");
      if (activeCustomersStart != null) {
        assumptionsApplied.push(
          "Derived churned customers from activeCustomersStart * churn rate.",
        );
      }
    } else {
      derivedChurned =
        input.retainedCustomersFromStartAtEnd != null
          ? churnedFromStart(
              activeCustomersStart ?? 0,
              input.retainedCustomersFromStartAtEnd,
            )
          : input.churnedCustomersPerPeriod ?? null;

      if (input.retainedCustomersFromStartAtEnd != null) {
        assumptionsApplied.push(
          "Derived churned customers from retainedCustomersFromStartAtEnd.",
        );
      } else {
        assumptionsApplied.push("Used provided churnedCustomersPerPeriod.");
      }

      churnValue = churnRate(
        derivedChurned ?? undefined,
        activeCustomersStart ?? 0,
      );
    }
    const retentionValue = churnValue == null ? null : 1 - churnValue;

    if (churnValue != null && churnValue < 0.005) {
      warnings.push("Churn is very low; LTV may be inflated.");
    }

    let derivedEndCustomers: number | null = null;
    if (derivedChurned != null && activeCustomersStart != null) {
      derivedEndCustomers =
        activeCustomersStart + input.newCustomersPerPeriod - derivedChurned;
      assumptionsApplied.push("Derived end customers as start + new - churned.");
    }
    if (derivedEndCustomers != null && derivedEndCustomers < 0) {
      warnings.push(
        "Derived end customers is negative; check start, new, and churn inputs.",
      );
      derivedEndCustomers = null;
    }

    const avgCustomers =
      activeCustomersStart == null
        ? null
        : derivedEndCustomers != null
          ? averageActiveCustomers(activeCustomersStart, derivedEndCustomers)
          : activeCustomersStart;

    const arpcValue =
      revenueInputMode === "direct_arpc"
        ? input.directArpc ?? null
        : input.revenuePerPeriod != null && avgCustomers != null
          ? arpc(input.revenuePerPeriod, avgCustomers)
          : null;

    if (revenueInputMode === "direct_arpc") {
      assumptionsApplied.push("Used direct subscription price / ARPC.");
    }

    const derivedMarketingSpend =
      cacInputMode === "direct" && input.directCac != null
        ? input.directCac * input.newCustomersPerPeriod
        : input.marketingSpendPerPeriod ?? 0;
    const cacValue =
      cacInputMode === "direct"
        ? input.directCac ?? null
        : cac(derivedMarketingSpend, input.newCustomersPerPeriod);

    let effectiveGrossMargin: number | null = null;
    let grossProfitPerCustomer: number | null = null;
    if (grossProfitInputMode === "margin") {
      effectiveGrossMargin = input.grossMargin ?? null;
      grossProfitPerCustomer =
        arpcValue != null && effectiveGrossMargin != null
          ? arpcValue * effectiveGrossMargin
          : null;
    } else if (arpcValue != null) {
      const variableCost = input.deliveryCostPerCustomerPerPeriod ?? 0;
      const fixedCostShare =
        avgCustomers != null && avgCustomers > 0
          ? (input.fixedDeliveryCostPerPeriod ?? 0) / avgCustomers
          : 0;
      grossProfitPerCustomer = arpcValue - variableCost - fixedCostShare;
      effectiveGrossMargin =
        arpcValue > 0 ? grossProfitPerCustomer / arpcValue : null;
      assumptionsApplied.push(
        "Derived gross profit from delivery costs per active customer.",
      );
      if ((input.fixedDeliveryCostPerPeriod ?? 0) > 0 && avgCustomers != null && avgCustomers > 0) {
        assumptionsApplied.push(
          "Allocated fixed delivery cost across average active customers.",
        );
      } else if ((input.fixedDeliveryCostPerPeriod ?? 0) > 0) {
        warnings.push(
          "Fixed delivery cost was provided without an active customer base; fixed cost was not allocated per customer.",
        );
      }
    }

    if (cacInputMode === "direct") {
      assumptionsApplied.push("Used direct CAC instead of deriving CAC from marketing spend.");
    }

    if (effectiveGrossMargin != null && effectiveGrossMargin < 0) {
      warnings.push("Delivery costs exceed revenue per customer; gross profit is negative.");
    }

    const cacPaybackPeriods =
      cacValue != null && grossProfitPerCustomer != null && grossProfitPerCustomer > 0
        ? cacValue / grossProfitPerCustomer
        : null;

    if (cacPaybackPeriods != null && cacPaybackPeriods > 12) {
      warnings.push("Payback is long; growth may be cash constrained.");
    }

    const ltv =
      grossProfitPerCustomer != null &&
      churnValue != null &&
      churnValue > 0
        ? grossProfitPerCustomer / churnValue
        : effectiveGrossMargin != null
          ? ltvSubscription(arpcValue, effectiveGrossMargin, churnValue)
          : null;
    const ltgpValue = ltgpPerCustomer(ltv);
    const ratio = ratioLtgpToCac(ltgpValue, cacValue);

    const results: KPIResult = {
      cac: cacValue,
      arpc: arpcValue,
      churnRate: churnValue,
      retentionRate: retentionValue,
      ltv,
      ltgpPerCustomer: ltgpValue,
      ltgpToCacRatio: ratio,
      cacPaybackPeriods,
      hypotheticalMaxRevenuePerYear:
        input.revenuePerPeriod != null
          ? annualizedRevenue(input.revenuePerPeriod, input.analysisPeriod)
          : null,
      hypotheticalMaxProfitPerYear:
        input.revenuePerPeriod != null
          ? annualizedProfit(
              input.revenuePerPeriod,
              effectiveGrossMargin ?? 0,
              derivedMarketingSpend,
              input.analysisPeriod,
            )
          : null,
      car: input.newCustomersPerPeriod,
    };

    if (cacValue == null) {
      warnings.push("CAC cannot be computed (newCustomersPerPeriod is 0).");
    }
    if (results.ltgpPerCustomer != null && results.ltgpToCacRatio == null) {
      warnings.push("LTGP:CAC cannot be computed (CAC is 0).");
    }

    return {
      results,
      warnings,
      assumptionsApplied,
      usedFlexibleCostInputs:
        revenueInputMode === "direct_arpc" ||
        grossProfitInputMode === "costs" ||
        cacInputMode === "direct" ||
        retentionInputMode === "rate",
    };
  },
};

export const evaluateOffer = (input: OfferInput): OfferEvaluation => {
  if (input.offerType === "subscription") {
    return subscriptionOfferEvaluator.evaluate(input);
  }
  throw new Error(`Unsupported offer type '${input.offerType}'.`);
};
