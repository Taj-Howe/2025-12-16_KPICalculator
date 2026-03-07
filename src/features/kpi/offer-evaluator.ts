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

    const derivedChurned =
      input.retainedCustomersFromStartAtEnd != null
        ? churnedFromStart(
            input.activeCustomersStart,
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

    const churnValue = churnRate(
      derivedChurned ?? undefined,
      input.activeCustomersStart,
    );
    const retentionValue = churnValue == null ? null : 1 - churnValue;

    if (churnValue != null && churnValue < 0.005) {
      warnings.push("Churn is very low; LTV may be inflated.");
    }

    let derivedEndCustomers: number | null = null;
    if (derivedChurned != null) {
      derivedEndCustomers =
        input.activeCustomersStart + input.newCustomersPerPeriod - derivedChurned;
      assumptionsApplied.push("Derived end customers as start + new - churned.");
    }
    if (derivedEndCustomers != null && derivedEndCustomers < 0) {
      warnings.push(
        "Derived end customers is negative; check start, new, and churn inputs.",
      );
      derivedEndCustomers = null;
    }

    const avgCustomers =
      derivedEndCustomers != null
        ? averageActiveCustomers(input.activeCustomersStart, derivedEndCustomers)
        : input.activeCustomersStart;

    const arpcValue = arpc(input.revenuePerPeriod, avgCustomers);
    const cacValue = cac(input.marketingSpendPerPeriod, input.newCustomersPerPeriod);
    const grossProfitPerCustomer =
      arpcValue != null ? arpcValue * input.grossMargin : null;
    const cacPaybackPeriods =
      cacValue != null && grossProfitPerCustomer != null && grossProfitPerCustomer > 0
        ? cacValue / grossProfitPerCustomer
        : null;

    if (cacPaybackPeriods != null && cacPaybackPeriods > 12) {
      warnings.push("Payback is long; growth may be cash constrained.");
    }

    const ltv = ltvSubscription(arpcValue, input.grossMargin, churnValue);
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
      hypotheticalMaxRevenuePerYear: annualizedRevenue(
        input.revenuePerPeriod,
        input.analysisPeriod,
      ),
      hypotheticalMaxProfitPerYear: annualizedProfit(
        input.revenuePerPeriod,
        input.grossMargin,
        input.marketingSpendPerPeriod,
        input.analysisPeriod,
      ),
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
    };
  },
};

export const evaluateOffer = (input: OfferInput): OfferEvaluation => {
  if (input.offerType === "subscription" || input.offerType === "software_subscription") {
    return subscriptionOfferEvaluator.evaluate(input);
  }
  throw new Error(`Unsupported offer type '${input.offerType}'.`);
};
