"use client";

import { useState, useMemo, useEffect } from "react";
import type { KPIInput, KPIResult } from "@/features/kpi/types";

type FormState = KPIInput;

const defaultState: FormState = {
  period: "monthly",
  businessModel: "subscription",
  revenuePerPeriod: 100000,
  grossMargin: 0.7,
  marketingSpendPerPeriod: 20000,
  newCustomersPerPeriod: 20,
  activeCustomersStart: 100,
  activeCustomersEnd: 110,
  churnedCustomersPerPeriod: 10,
  retentionRatePerPeriod: 0.6,
};

export default function Home() {
  const [form, setForm] = useState<FormState>(defaultState);
  const [results, setResults] = useState<KPIResult | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const periodLabel = useMemo(() => `${form.period} period`, [form.period]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "period" || name === "businessModel"
          ? value
          : value === ""
            ? undefined
            : Number(value),
    }));
  };

  const visibleChurnField =
    form.businessModel === "subscription" || form.businessModel === "hybrid";
  const visibleRetentionField =
    form.businessModel === "transactional" || form.businessModel === "hybrid";

  useEffect(() => {
    setForm((prev) => {
      const updates: Partial<FormState> = {};
      if (!visibleChurnField && prev.churnedCustomersPerPeriod != null) {
        updates.churnedCustomersPerPeriod = undefined;
      }
      if (!visibleRetentionField && prev.retentionRatePerPeriod != null) {
        updates.retentionRatePerPeriod = undefined;
      }
      if (Object.keys(updates).length === 0) {
        return prev;
      }
      return { ...prev, ...updates };
    });
  }, [visibleChurnField, visibleRetentionField]);

  const grossMarginError =
    form.grossMargin != null && form.grossMargin > 1
      ? "Gross margin cannot exceed 1.0 (100%)."
      : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (grossMarginError) {
      setError(grossMarginError);
      return;
    }
    setSubmitting(true);
    setError(null);
    setResults(null);
    setWarnings([]);

    try {
      const response = await fetch("/api/kpi/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Unable to calculate KPIs.");
        return;
      }

      const data = await response.json();
      setResults(data.results);
      setWarnings(data.warnings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">KPI Calculator</h1>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1">
          Period
          <select
            name="period"
            value={form.period}
            onChange={handleChange}
            className="rounded border border-gray-300 p-2"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          Business Model
          <select
            name="businessModel"
            value={form.businessModel}
            onChange={handleChange}
            className="rounded border border-gray-300 p-2"
          >
            <option value="subscription">Subscription</option>
            <option value="transactional">Transactional</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </label>

        {[
          { label: `Revenue (per ${periodLabel})`, name: "revenuePerPeriod" },
          {
            label: "Gross Margin (0-1)",
            name: "grossMargin",
            helper: "Before marketing/CAC. Example: 0.7 = 70%.",
          },
          {
            label: `Marketing Spend (per ${periodLabel})`,
            name: "marketingSpendPerPeriod",
          },
          {
            label: `New Customers (per ${periodLabel})`,
            name: "newCustomersPerPeriod",
          },
          { label: "Active Customers Start", name: "activeCustomersStart" },
          { label: "Active Customers End", name: "activeCustomersEnd" },
        ].map((field) => (
          <label key={field.name} className="flex flex-col gap-1">
            {field.label}
            <input
              type="number"
              name={field.name}
              value={form[field.name as keyof FormState] ?? ""}
              onChange={handleChange}
              className="rounded border border-gray-300 p-2"
            />
            {"helper" in field && field.helper && (
              <span className="text-sm text-gray-600">{field.helper}</span>
            )}
            {field.name === "grossMargin" && grossMarginError && (
              <span className="text-sm text-red-600">{grossMarginError}</span>
            )}
          </label>
        ))}

        {visibleChurnField && (
          <label className="flex flex-col gap-1">
            Churned Customers Per Period
            <input
              type="number"
              name="churnedCustomersPerPeriod"
              value={form.churnedCustomersPerPeriod ?? ""}
              onChange={handleChange}
              className="rounded border border-gray-300 p-2"
            />
          </label>
        )}

        {visibleRetentionField && (
          <label className="flex flex-col gap-1">
            Retention Rate Per Period (0-1)
            <input
              type="number"
              step="0.01"
              name="retentionRatePerPeriod"
              value={form.retentionRatePerPeriod ?? ""}
              onChange={handleChange}
              className="rounded border border-gray-300 p-2"
            />
          </label>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Calculating..." : "Calculate KPIs"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(defaultState);
              setResults(null);
              setWarnings([]);
              setError(null);
            }}
            className="rounded border border-gray-300 px-4 py-2 text-gray-700"
          >
            Reset
          </button>
        </div>
      </form>

      {error && <p className="text-red-600">{error}</p>}

      {warnings.length > 0 && (
        <div className="rounded border border-yellow-400 bg-yellow-50 p-4">
          <h2 className="font-semibold">Warnings</h2>
          <ul className="list-disc pl-6">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <details className="rounded border border-gray-200 p-4">
        <summary className="cursor-pointer font-semibold">
          What these metrics mean
        </summary>
        <div className="mt-3 space-y-2 text-sm text-gray-700">
          <p>All values are per selected period (monthly/quarterly/yearly).</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>CAC</strong>: Cost to acquire each new customer during the
              period.
            </li>
            <li>
              <strong>ARPC</strong>: Average revenue per customer in the period.
            </li>
            <li>
              <strong>Churn rate</strong>: Portion of starting customers lost
              during the period.
            </li>
            <li>
              <strong>LTGP per customer</strong>: Lifetime gross profit per
              customer (gross margin adjusted LTV).
            </li>
            <li>
              <strong>LTGP:CAC (Growth Assessment)</strong>: Ratio of LTGP to
              CAC. Higher generally means better unit economics.
            </li>
            <li>
              <strong>Annualized revenue/profit</strong>: Period revenue/profit
              scaled by periods per year (1/4/12).
            </li>
          </ul>
        </div>
      </details>

      {results && (
        <div className="rounded border border-gray-200 p-4">
          <h2 className="font-semibold">Results</h2>
          <ul>
            {Object.entries(results).map(([key, value]) => (
              <li key={key}>
                {key}: {value ?? "n/a"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
