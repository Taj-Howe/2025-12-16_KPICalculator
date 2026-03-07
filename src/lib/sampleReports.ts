import type { CalculationVersion, OfferInput } from "@/features/kpi/types";
import { evaluateKpis } from "@/features/kpi/service";

type ReportPayload = {
  title?: string;
  channel?: string;
  periodLabel: string;
  inputs: OfferInput;
  results: ReturnType<typeof evaluateKpis>["results"];
  warnings: string[];
  calculationVersion: CalculationVersion;
  assumptionsApplied: string[];
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const generateSampleYearReports = (year: number): ReportPayload[] => {
  const reports: ReportPayload[] = [];
  const baseRevenue = 85000;
  const baseCustomers = 120;
  const baseMarketing = 22000;
  const baseChurnRate = 0.12;

  for (let month = 1; month <= 12; month += 1) {
    const growth = 1 + month * 0.04;
    const revenue = Math.round(baseRevenue * growth);
    const marketingSpend = Math.round(baseMarketing * (1 - month * 0.01));
    const newCustomers = Math.round(18 + month * 2);
    const startCustomers = Math.round(baseCustomers + month * 10);
    const churnRate = clamp(baseChurnRate - month * 0.004, 0.04, 0.2);
    const retainedFromStart = Math.round(startCustomers * (1 - churnRate));

    const inputs: OfferInput = {
      offerId: "sample-subscription-offer",
      offerName: "Sample Subscription Offer",
      offerType: "subscription",
      analysisPeriod: "monthly",
      revenueInputMode: "total_revenue",
      grossProfitInputMode: "margin",
      cacInputMode: "derived",
      retentionInputMode: "counts",
      revenuePerPeriod: revenue,
      grossMargin: 0.7,
      marketingSpendPerPeriod: marketingSpend,
      newCustomersPerPeriod: newCustomers,
      activeCustomersStart: startCustomers,
      retainedCustomersFromStartAtEnd: retainedFromStart,
    };

    const evaluation = evaluateKpis(inputs);
    reports.push({
      title: `Sample Month ${month}`,
      channel: "sample",
      periodLabel: `${year}-${String(month).padStart(2, "0")}`,
      inputs,
      results: evaluation.results,
      warnings: evaluation.warnings,
      calculationVersion: evaluation.calculationVersion,
      assumptionsApplied: evaluation.assumptionsApplied,
    });
  }

  return reports;
};
