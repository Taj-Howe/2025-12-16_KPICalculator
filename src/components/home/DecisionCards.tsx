"use client";

import type { KPIResult } from "@/features/kpi/types";
import { formatPercent, formatRatio } from "./formatters";
import { StatCard } from "./form-primitives";

const formatPeriods = (value: number | null) =>
  value == null ? "—" : `${value.toFixed(2)} periods`;

const formatCount = (value: number | null) =>
  value == null ? "—" : value.toLocaleString("en-US");

const DecisionCards = ({ results }: { results: KPIResult | null }) => {
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
        value={formatCount(results?.car ?? null)}
        caption="New customers per period"
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
