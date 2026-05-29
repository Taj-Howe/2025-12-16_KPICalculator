"use client";

import { monthlySalesVelocity } from "@/features/kpi/formulas";
import type { KPIResult, KpiPeriod } from "@/features/kpi/types";
import { formatPercent, formatRatio } from "./formatters";
import { StatCard } from "./form-primitives";

const formatPeriods = (value: number | null) =>
  value == null ? "—" : `${value.toFixed(2)} periods`;

const formatVelocity = (value: number | null) =>
  value == null
    ? "—"
    : `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}/mo`;

const DecisionCards = ({
  results,
  period,
}: {
  results: KPIResult | null;
  period: KpiPeriod;
}) => {
  const velocity = monthlySalesVelocity(results?.car ?? null, period);

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        eyebrow="Core ratio"
        value={formatRatio(results?.ltgpToCacRatio ?? null)}
        caption="LTGP:CAC"
      />
      <StatCard
        eyebrow="Cash recovery"
        value={formatPeriods(results?.cacPaybackPeriods ?? null)}
        caption="CAC payback"
      />
      <StatCard
        eyebrow="Sales velocity"
        value={formatVelocity(velocity)}
        caption="New customers per month"
      />
      <StatCard
        eyebrow="Churn"
        value={formatPercent(results?.churnRate ?? null)}
        caption="Starting cohort lost per period"
      />
    </section>
  );
};

export default DecisionCards;
