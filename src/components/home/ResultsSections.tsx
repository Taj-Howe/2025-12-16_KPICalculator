"use client";

import type { ReactNode } from "react";
import type { KPIResult } from "@/features/kpi/types";
import type { KPIInputState } from "./types";
import { formatMoney, formatPercent, formatRatio } from "./formatters";
import { panelClassName } from "./form-primitives";

const countFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const formatCount = (value: number | null) =>
  value == null ? "—" : countFormatter.format(value);

const formatPeriods = (value: number | null) =>
  value == null ? "—" : `${value.toFixed(2)} periods`;

const SectionCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => {
  return (
    <section className={panelClassName}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="text-xs text-white/54">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
};

const MetricRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex items-center justify-between gap-4 text-sm">
    <span className="text-white/66">{label}</span>
    <span className="font-medium text-white">{value}</span>
  </div>
);

const CustomerBridge = ({
  inputs,
}: {
  inputs: KPIInputState;
}) => {
  if (!("activeCustomersStart" in inputs)) {
    return null;
  }
  const start = inputs.activeCustomersStart ?? null;
  const newCustomers = inputs.newCustomersPerPeriod ?? null;
  const derivedChurned =
    inputs.churnedCustomersPerPeriod != null
      ? inputs.churnedCustomersPerPeriod
      : inputs.retainedCustomersFromStartAtEnd != null &&
          inputs.activeCustomersStart != null
        ? inputs.activeCustomersStart - inputs.retainedCustomersFromStartAtEnd
        : inputs.directChurnRatePerPeriod != null && start != null
          ? start * inputs.directChurnRatePerPeriod
          : null;
  const derivedEnd =
    start != null && newCustomers != null && derivedChurned != null
      ? start + newCustomers - derivedChurned
      : null;

  return (
    <div className="mt-4 rounded-[18px] border border-white/8 bg-white/[0.015] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/36">
        Customer Bridge
      </p>
      <div className="mt-3 space-y-2">
        <MetricRow label="Start customers" value={formatCount(start)} />
        <MetricRow label="+ New customers" value={formatCount(newCustomers)} />
        <MetricRow
          label="- Churned customers (derived)"
          value={formatCount(derivedChurned)}
        />
        <div className="border-t border-white/8 pt-2">
          <MetricRow label="= Derived end customers" value={formatCount(derivedEnd)} />
        </div>
      </div>
      {start == null ? (
        <p className="mt-3 text-xs text-white/52">
          Add a starting customer base if you want the cohort movement shown here.
        </p>
      ) : derivedChurned == null ? (
        <p className="mt-3 text-xs text-white/52">
          Provide churned, retained, or direct churn rate inputs to unlock the bridge.
        </p>
      ) : null}
    </div>
  );
};

const ResultsSections = ({
  results,
  warnings,
  inputs,
}: {
  results: KPIResult | null;
  warnings: string[];
  inputs: KPIInputState;
}) => {
  return (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <section className="rounded-[22px] border border-amber-300/15 bg-amber-400/10 p-4 text-sm text-amber-50">
          <p className="font-semibold">Warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}

      <SectionCard
        title="Unit Economics"
        description="The per-customer and per-period economics of the current offer."
      >
        <div className="space-y-3">
          <MetricRow label="CAC" value={formatMoney(results?.cac ?? null)} />
          <MetricRow label="ARPC" value={formatMoney(results?.arpc ?? null)} />
          <MetricRow label="LTV" value={formatMoney(results?.ltv ?? null)} />
          <MetricRow
            label="LTGP per customer"
            value={formatMoney(results?.ltgpPerCustomer ?? null)}
          />
          <MetricRow
            label="Retention"
            value={formatPercent(results?.retentionRate ?? null)}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Steady-State Ceiling"
        description="Where the offer settles if current sales velocity and churn hold."
      >
        <div className="space-y-3">
          <MetricRow
            label="Hypothetical max customers"
            value={formatCount(results?.hypotheticalMaxCustomers ?? null)}
          />
          <MetricRow
            label="Hypothetical max revenue / year"
            value={formatMoney(results?.hypotheticalMaxRevenuePerYear ?? null)}
          />
          <MetricRow
            label="Hypothetical max profit / year"
            value={formatMoney(results?.hypotheticalMaxProfitPerYear ?? null)}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Next-Year Projection"
        description="Projected output over the next analysis year from the current offer shape."
      >
        <div className="space-y-3">
          <MetricRow
            label="Projected revenue / next year"
            value={formatMoney(results?.projectedRevenueNextYear ?? null)}
          />
          <MetricRow
            label="Projected profit / next year"
            value={formatMoney(results?.projectedProfitNextYear ?? null)}
          />
          <MetricRow
            label="LTGP:CAC"
            value={formatRatio(results?.ltgpToCacRatio ?? null)}
          />
          <MetricRow
            label="CAC payback"
            value={formatPeriods(results?.cacPaybackPeriods ?? null)}
          />
        </div>
        <CustomerBridge inputs={inputs} />
      </SectionCard>
    </div>
  );
};

export default ResultsSections;
