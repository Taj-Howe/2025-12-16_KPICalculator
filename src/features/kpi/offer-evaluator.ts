import { ltgpPerCustomer, ltvSubscription, ratioLtgpToCac } from "./formulas";
import {
  buildSubscriptionForecast,
  deriveSubscriptionMetrics,
} from "./subscription-forecast";
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
    const derived = deriveSubscriptionMetrics(input);
    const activeCustomersStart = derived.activeCustomersStart;
    const churnValue = derived.churnValue;
    const derivedEndCustomers = derived.derivedEndCustomers;
    const avgCustomers = derived.avgCustomers;
    const arpcValue = derived.arpcValue;
    const cacValue = derived.cacValue;
    const effectiveGrossMargin = derived.effectiveGrossMargin;
    const grossProfitPerCustomer = derived.grossProfitPerCustomer;

    if (retentionInputMode === "rate") {
      assumptionsApplied.push("Used direct churn rate for subscription retention.");
      if (activeCustomersStart != null) {
        assumptionsApplied.push(
          "Derived churned customers from activeCustomersStart * churn rate.",
        );
      }
    } else {
      if (input.retainedCustomersFromStartAtEnd != null) {
        assumptionsApplied.push(
          "Derived churned customers from retainedCustomersFromStartAtEnd.",
        );
      } else {
        assumptionsApplied.push("Used provided churnedCustomersPerPeriod.");
      }
    }
    const retentionValue = churnValue == null ? null : 1 - churnValue;

    if (churnValue != null && churnValue < 0.005) {
      warnings.push("Churn is very low; LTV may be inflated.");
    }

    if (derivedEndCustomers != null && activeCustomersStart != null) {
      assumptionsApplied.push("Derived end customers as start + new - churned.");
    }
    if (derivedEndCustomers != null && derivedEndCustomers < 0) {
      warnings.push(
        "Derived end customers is negative; check start, new, and churn inputs.",
      );
    }

    if (revenueInputMode === "direct_arpc") {
      assumptionsApplied.push("Used direct subscription price / ARPC.");
    }
 
    if (grossProfitInputMode === "costs" && arpcValue != null) {
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
    const forecast = buildSubscriptionForecast(input, derived);

    if (forecast.totals.revenue != null || forecast.totals.profit != null) {
      assumptionsApplied.push(
        "Projected annual revenue and profit from direct price, churn rate, and sales velocity.",
      );
      if (input.activeCustomersStart == null) {
        assumptionsApplied.push(
          "Assumed zero starting active customers for annual projection.",
        );
      }
    }

    const hypotheticalMaxCustomers = forecast.steadyState.customers;
    if (hypotheticalMaxCustomers != null) {
      assumptionsApplied.push(
        "Derived steady-state max customers as sales velocity divided by churn.",
      );
    }

    const results: KPIResult = {
      cac: cacValue,
      arpc: arpcValue,
      churnRate: churnValue,
      retentionRate: retentionValue,
      ltv,
      ltgpPerCustomer: ltgpValue,
      ltgpToCacRatio: ratio,
      cacPaybackPeriods,
      hypotheticalMaxCustomers,
      hypotheticalMaxRevenuePerYear: forecast.steadyState.revenuePerYear,
      hypotheticalMaxProfitPerYear: forecast.steadyState.profitPerYear,
      projectedRevenueNextYear: forecast.totals.revenue,
      projectedProfitNextYear: forecast.totals.profit,
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
  if (input.offerType === "subscription" || input.offerType === "software_subscription") {
    return subscriptionOfferEvaluator.evaluate(input);
  }
  throw new Error(`Unsupported offer type '${input.offerType}'.`);
};
