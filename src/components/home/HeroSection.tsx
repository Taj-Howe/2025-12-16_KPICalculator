"use client";

import { useMemo } from "react";
import { evaluateOffer } from "@/features/kpi/offer-evaluator";
import { buildSubscriptionForecast } from "@/features/kpi/subscription-forecast";
import type {
  KPIResult,
  KpiPeriod,
  SubscriptionOfferInput,
} from "@/features/kpi/types";
import type { KPIInputState } from "./types";
import ProjectionHeroChart from "./ProjectionHeroChart";
import { formatMoney, formatRatio } from "./formatters";
import { StatCard } from "./form-primitives";

type HeroSectionProps = {
  input: KPIInputState;
  results: KPIResult | null;
  analysisPeriod: KpiPeriod;
};

const formatPeriods = (value: number | null) => {
  if (value == null) {
    return "—";
  }
  return `${value.toFixed(2)} periods`;
};

const HeroSection = ({
  input,
  results,
  analysisPeriod,
}: HeroSectionProps) => {
  const forecastInput = useMemo<SubscriptionOfferInput | null>(() => {
    if (input.offerType === "software_subscription") {
      return input;
    }

    if (input.offerType === "software_token_pricing") {
      return {
        offerId: input.offerId,
        offerName: input.offerName,
        offerType: "software_subscription",
        analysisPeriod: input.analysisPeriod,
        revenueInputMode: "direct_arpc",
        directArpc:
          input.usageUnitsPerCustomerPerPeriod * input.pricePerUsageUnit,
        grossProfitInputMode: "costs",
        deliveryCostPerCustomerPerPeriod:
          input.usageUnitsPerCustomerPerPeriod * input.costPerUsageUnit,
        fixedDeliveryCostPerPeriod: input.fixedDeliveryCostPerPeriod,
        cacInputMode: input.cacInputMode,
        marketingSpendPerPeriod: input.marketingSpendPerPeriod,
        directCac: input.directCac,
        retentionInputMode: input.retentionInputMode,
        newCustomersPerPeriod: input.newCustomersPerPeriod,
        activeCustomersStart: input.activeCustomersStart,
        directChurnRatePerPeriod: input.directChurnRatePerPeriod,
        churnedCustomersPerPeriod: input.churnedCustomersPerPeriod,
        retainedCustomersFromStartAtEnd: input.retainedCustomersFromStartAtEnd,
        softwareConfig: input.softwareConfig,
      };
    }

    if (input.offerType === "software_hybrid_platform_usage") {
      return {
        offerId: input.offerId,
        offerName: input.offerName,
        offerType: "software_subscription",
        analysisPeriod: input.analysisPeriod,
        revenueInputMode: "direct_arpc",
        directArpc:
          input.platformFeePerCustomerPerPeriod +
          input.usageUnitsPerCustomerPerPeriod * input.pricePerUsageUnit,
        grossProfitInputMode: "costs",
        deliveryCostPerCustomerPerPeriod:
          (input.platformDeliveryCostPerCustomerPerPeriod ?? 0) +
          input.usageUnitsPerCustomerPerPeriod * (input.costPerUsageUnit ?? 0),
        fixedDeliveryCostPerPeriod: input.fixedDeliveryCostPerPeriod,
        cacInputMode: input.cacInputMode,
        marketingSpendPerPeriod: input.marketingSpendPerPeriod,
        directCac: input.directCac,
        retentionInputMode: input.retentionInputMode,
        newCustomersPerPeriod: input.newCustomersPerPeriod,
        activeCustomersStart: input.activeCustomersStart,
        directChurnRatePerPeriod: input.directChurnRatePerPeriod,
        churnedCustomersPerPeriod: input.churnedCustomersPerPeriod,
        retainedCustomersFromStartAtEnd: input.retainedCustomersFromStartAtEnd,
        softwareConfig: input.softwareConfig,
      };
    }

    if (input.offerType === "software_implementation_plus_subscription") {
      return {
        offerId: input.offerId,
        offerName: input.offerName,
        offerType: "software_subscription",
        analysisPeriod: input.analysisPeriod,
        revenueInputMode: "direct_arpc",
        directArpc: input.directArpc,
        grossProfitInputMode: input.grossProfitInputMode,
        grossMargin: input.grossMargin,
        deliveryCostPerCustomerPerPeriod: input.deliveryCostPerCustomerPerPeriod,
        fixedDeliveryCostPerPeriod: input.fixedDeliveryCostPerPeriod,
        cacInputMode: input.cacInputMode,
        marketingSpendPerPeriod: input.marketingSpendPerPeriod,
        directCac: input.directCac,
        retentionInputMode: input.retentionInputMode,
        newCustomersPerPeriod: input.newCustomersPerPeriod,
        activeCustomersStart: input.activeCustomersStart,
        directChurnRatePerPeriod: input.directChurnRatePerPeriod,
        churnedCustomersPerPeriod: input.churnedCustomersPerPeriod,
        retainedCustomersFromStartAtEnd: input.retainedCustomersFromStartAtEnd,
        softwareConfig: input.softwareConfig,
      };
    }

    return null;
  }, [input]);

  const liveResults = useMemo(() => {
    try {
      return evaluateOffer(input).results;
    } catch {
      return results;
    }
  }, [input, results]);

  const liveForecast = useMemo(
    () => (forecastInput ? buildSubscriptionForecast(forecastInput) : null),
    [forecastInput],
  );
  const heroResults = liveResults ?? results;

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] px-6 py-8 shadow-[0_40px_120px_rgba(0,0,0,0.45)] sm:px-8 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/8" />
      <div className="relative space-y-6">
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/8 pb-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/34">
                Forecast Dashboard
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                {input.offerName}
              </h2>
              <p className="mt-1 text-sm text-white/56">
                {input.offerId} · {analysisPeriod} analysis · {input.offerType}
              </p>
            </div>
            <p className="max-w-sm text-sm text-white/54">
              Live dashboard from the current offer inputs, with steady-state
              ceiling and next-year path where the offer has recurring retention.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              eyebrow="Core ratio"
              value={formatRatio(heroResults?.ltgpToCacRatio ?? null)}
              caption="LTGP:CAC"
            />
            <StatCard
              eyebrow="Cash recovery"
              value={formatPeriods(heroResults?.cacPaybackPeriods ?? null)}
              caption="CAC payback"
            />
            <StatCard
              eyebrow="Next-year profit"
              value={formatMoney(heroResults?.projectedProfitNextYear ?? null)}
              caption="Projected profit"
            />
            <StatCard
              eyebrow="Max revenue"
              value={formatMoney(heroResults?.hypotheticalMaxRevenuePerYear ?? null)}
              caption="Steady-state ceiling"
            />
          </div>
        </div>

        <ProjectionHeroChart forecast={liveForecast} periodLabel={analysisPeriod} />
      </div>
    </section>
  );
};

export default HeroSection;
