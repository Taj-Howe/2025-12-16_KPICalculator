"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import type { KPIInput, KPIResult, KpiPeriod } from "@/features/kpi/types";

type FormState = KPIInput;
type ResultKey =
  | "cac"
  | "arpc"
  | "churnRate"
  | "retentionRate"
  | "ltv"
  | "ltgpPerCustomer"
  | "ltgpToCacRatio"
  | "hypotheticalMaxRevenuePerYear"
  | "hypotheticalMaxProfitPerYear"
  | "car";
type Evaluation = {
  inputs: KPIInput;
  results: KPIResult;
};

const defaultState: FormState = {
  period: "monthly",
  businessModel: "subscription",
  revenuePerPeriod: 100000,
  grossMargin: 0.7,
  marketingSpendPerPeriod: 20000,
  newCustomersPerPeriod: 20,
  activeCustomersStart: 100,
  retainedCustomersFromStartAtEnd: 90,
  retentionRatePerPeriod: 0.6,
};

const pad = (value: number) => String(value).padStart(2, "0");

const defaultPeriodLabelFor = (period: KpiPeriod, date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  if (period === "monthly") {
    return `${year}-${pad(month + 1)}`;
  }
  if (period === "quarterly") {
    const quarter = Math.floor(month / 3) + 1;
    return `${year}-Q${quarter}`;
  }
  return `${year}`;
};

const startOfPeriod = (date: Date, period: KpiPeriod) => {
  const start = new Date(date);
  if (period === "monthly") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === "quarterly") {
    const quarter = Math.floor(start.getMonth() / 3);
    start.setMonth(quarter * 3, 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  return start;
};

const addPeriods = (date: Date, period: KpiPeriod, offset: number) => {
  const next = new Date(date);
  if (period === "monthly") {
    next.setMonth(next.getMonth() + offset);
    return startOfPeriod(next, period);
  }
  if (period === "quarterly") {
    next.setMonth(next.getMonth() + offset * 3);
    return startOfPeriod(next, period);
  }
  next.setFullYear(next.getFullYear() + offset);
  return startOfPeriod(next, period);
};

const endOfPeriod = (start: Date, period: KpiPeriod) => {
  const nextStart = addPeriods(start, period, 1);
  const end = new Date(nextStart.getTime() - 1);
  end.setHours(0, 0, 0, 0);
  return end;
};

const formatRangeDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const quarterLabel = (date: Date) => {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${quarter}`;
};

const labelForPeriodStart = (start: Date, period: KpiPeriod) => {
  if (period === "monthly") {
    return `${start.getFullYear()}-${pad(start.getMonth() + 1)}`;
  }
  if (period === "quarterly") {
    return quarterLabel(start);
  }
  return `${start.getFullYear()}`;
};

const displayLabelForPeriod = (start: Date, end: Date, period: KpiPeriod) => {
  if (period === "monthly") {
    return `${start.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    })} (${formatRangeDate(start)} – ${formatRangeDate(end)})`;
  }
  if (period === "quarterly") {
    const quarter = Math.floor(start.getMonth() / 3) + 1;
    return `Q${quarter} ${start.getFullYear()} (${formatRangeDate(start)} – ${formatRangeDate(end)})`;
  }
  return `${start.getFullYear()} (${formatRangeDate(start)} – ${formatRangeDate(end)})`;
};

type PeriodOption = {
  value: string;
  display: string;
  range: string;
};

const generatePeriodOptions = (period: KpiPeriod, count = 12): PeriodOption[] => {
  const options: PeriodOption[] = [];
  const start = startOfPeriod(new Date(), period);
  for (let i = 0; i < count; i += 1) {
    const currentStart = addPeriods(start, period, -i);
    const end = endOfPeriod(currentStart, period);
    const value = labelForPeriodStart(currentStart, period);
    const display = displayLabelForPeriod(currentStart, end, period);
    options.push({
      value,
      display,
      range: `${formatRangeDate(currentStart)} – ${formatRangeDate(end)}`,
    });
  }
  return options;
};

export default function Home() {
  const [form, setForm] = useState<FormState>(defaultState);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSubmitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [churnInputMode, setChurnInputMode] = useState<"retained" | "churned">(
    "retained",
  );
  const periodLabel = useMemo(() => `${form.period} period`, [form.period]);
  const usd = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
    [],
  );
  const int = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
      }),
    [],
  );

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

  const showRetainedField =
    form.businessModel === "subscription" || form.businessModel === "hybrid";
  const showRetentionRateField =
    form.businessModel === "transactional" || form.businessModel === "hybrid";
  const showActiveCustomersEnd =
    form.businessModel === "transactional" || form.businessModel === "hybrid";

  useEffect(() => {
    setForm((prev) => {
      const updates: Partial<FormState> = {};
      if (!showRetainedField) {
        if (prev.retainedCustomersFromStartAtEnd != null) {
          updates.retainedCustomersFromStartAtEnd = undefined;
        }
        if (prev.churnedCustomersPerPeriod != null) {
          updates.churnedCustomersPerPeriod = undefined;
        }
      } else if (churnInputMode === "retained") {
        if (prev.churnedCustomersPerPeriod != null) {
          updates.churnedCustomersPerPeriod = undefined;
        }
      } else {
        if (prev.retainedCustomersFromStartAtEnd != null) {
          updates.retainedCustomersFromStartAtEnd = undefined;
        }
      }
      if (!showRetentionRateField && prev.retentionRatePerPeriod != null) {
        updates.retentionRatePerPeriod = undefined;
      }
      if (!showActiveCustomersEnd && prev.activeCustomersEnd != null) {
        updates.activeCustomersEnd = undefined;
      }
      if (Object.keys(updates).length === 0) {
        return prev;
      }
      return { ...prev, ...updates };
    });
  }, [showRetainedField, showRetentionRateField, showActiveCustomersEnd, churnInputMode]);

  useEffect(() => {
    if (!showRetainedField && churnInputMode !== "retained") {
      setChurnInputMode("retained");
    }
  }, [showRetainedField, churnInputMode]);

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
    setEvaluation(null);
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
      setEvaluation({ inputs: data.inputs, results: data.results });
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
              <span className="text-sm text-gray-700 dark:text-gray-200">
                {field.helper}
              </span>
            )}
            {field.name === "grossMargin" && grossMarginError && (
              <span className="text-sm text-red-600">{grossMarginError}</span>
            )}
          </label>
        ))}

        {showActiveCustomersEnd && (
          <label className="flex flex-col gap-1">
            Active customers at end (per period)
            <input
              type="number"
              name="activeCustomersEnd"
              value={form.activeCustomersEnd ?? ""}
              onChange={handleChange}
              className="rounded border border-gray-300 p-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-200">
              Transactional/Hybrid: number of unique customers active by period end (used for ARPC averaging).
            </span>
          </label>
        )}
        <p className="text-sm text-gray-700 dark:text-gray-200">
          End customers are derived from start customers + new customers − churn
          (or derived churn).
        </p>

        {showRetainedField && (
          <div className="space-y-3 rounded border border-gray-200 p-3">
            <p className="font-medium">How do you want to input churn?</p>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="churnMode"
                value="retained"
                checked={churnInputMode === "retained"}
                onChange={() => setChurnInputMode("retained")}
              />
              <span>I know how many start customers remained</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="churnMode"
                value="churned"
                checked={churnInputMode === "churned"}
                onChange={() => setChurnInputMode("churned")}
              />
              <span>I know churned customers</span>
            </label>
          </div>
        )}

        {showRetainedField && churnInputMode === "retained" && (
          <label className="flex flex-col gap-1">
            Customers from start still active at end
            <input
              type="number"
              name="retainedCustomersFromStartAtEnd"
              value={form.retainedCustomersFromStartAtEnd ?? ""}
              onChange={handleChange}
              className="rounded border border-gray-300 p-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-200">
              Cohort retention: subset of starting customers.
            </span>
          </label>
        )}

        {showRetainedField && churnInputMode === "churned" && (
          <label className="flex flex-col gap-1">
            Churned customers per period
            <input
              type="number"
              name="churnedCustomersPerPeriod"
              value={form.churnedCustomersPerPeriod ?? ""}
              onChange={handleChange}
              className="rounded border border-gray-300 p-2"
            />
          </label>
        )}

        {showRetentionRateField && (
          <label className="flex flex-col gap-1">
            Retention rate (repeat purchase rate) per period (0–1)
            <input
              type="number"
              step="0.01"
              name="retentionRatePerPeriod"
              value={form.retentionRatePerPeriod ?? ""}
              onChange={handleChange}
              className="rounded border border-gray-300 p-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-200">
              Example: 0.6 means 60% of the period-start cohort repeats.
            </span>
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
              setEvaluation(null);
              setWarnings([]);
              setError(null);
              setChurnInputMode("retained");
            }}
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 dark:text-gray-200"
          >
            Reset
          </button>
        </div>
      </form>

      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}

      {warnings.length > 0 && (
        <div className="rounded border border-yellow-700 bg-yellow-100 p-4 text-yellow-900 dark:border-yellow-500 dark:bg-yellow-900/30 dark:text-yellow-100">
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
        <div className="mt-3 space-y-2 text-sm text-gray-800 dark:text-gray-200">
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

      {evaluation && (
        <>
          <ResultsPanel
            results={evaluation.results}
            inputs={evaluation.inputs}
            usd={usd}
            intFormatter={int}
          />
          <ReportSavePanel
            evaluation={evaluation}
            warnings={warnings}
          />
        </>
      )}
    </main>
  );
}

const ResultsPanel = ({
  results,
  inputs,
  usd,
  intFormatter,
}: {
  results: KPIResult;
  inputs: KPIInput;
  usd: Intl.NumberFormat;
  intFormatter: Intl.NumberFormat;
}) => {
  const pct = (value: number | null) =>
    value == null ? "—" : `${(value * 100).toFixed(2)}%`;

  const ratioX = (value: number | null) =>
    value == null ? "—" : `${value.toFixed(2)}x`;

  const formatMoney = (value: number | null) =>
    value == null ? "—" : usd.format(value);

  const formatInt = (value: number | null) =>
    value == null ? "—" : intFormatter.format(value);

const formatMap: Record<ResultKey, () => string> = {
  cac: () => formatMoney(results.cac),
  arpc: () => formatMoney(results.arpc),
    churnRate: () => pct(results.churnRate),
    retentionRate: () => pct(results.retentionRate),
    ltv: () => formatMoney(results.ltv),
  ltgpPerCustomer: () => formatMoney(results.ltgpPerCustomer),
  ltgpToCacRatio: () => ratioX(results.ltgpToCacRatio),
  cacPaybackPeriods: () =>
    results.cacPaybackPeriods == null
      ? "—"
      : `${results.cacPaybackPeriods.toFixed(2)} periods`,
  hypotheticalMaxRevenuePerYear: () =>
    formatMoney(results.hypotheticalMaxRevenuePerYear),
    hypotheticalMaxProfitPerYear: () =>
      formatMoney(results.hypotheticalMaxProfitPerYear),
    car: () => `${formatInt(results.car)} per period`,
  };

  const labelMap: Record<ResultKey, string> = {
    cac: "Customer acquisition cost (CAC)",
    arpc: "Average revenue per customer (ARPC)",
    churnRate: "Churn rate",
    retentionRate: "Retention rate",
    ltv: "Lifetime value (gross margin-adjusted)",
  ltgpPerCustomer: "Lifetime gross profit per customer (LTGP)",
  ltgpToCacRatio: "LTGP:CAC",
  cacPaybackPeriods: "CAC payback (periods)",
    hypotheticalMaxRevenuePerYear: "Hypothetical max revenue per year",
    hypotheticalMaxProfitPerYear: "Hypothetical max profit per year",
    car: "New customers per period",
  };

  const orderedKeys: ResultKey[] = [
    "cac",
    "arpc",
    "churnRate",
    "retentionRate",
    "ltv",
    "ltgpPerCustomer",
    "ltgpToCacRatio",
    "cacPaybackPeriods",
    "hypotheticalMaxRevenuePerYear",
    "hypotheticalMaxProfitPerYear",
    "car",
  ];

  return (
    <div className="space-y-4 rounded border border-gray-200 p-4 text-gray-900 dark:text-gray-100">
      <h2 className="font-semibold">Results</h2>
      <ul className="mt-4 space-y-2 text-sm">
        {orderedKeys.map((key) => (
          <li key={key} className="flex items-center justify-between gap-4">
            <span className="font-medium">{labelMap[key]}</span>
            <span>{formatMap[key]()}</span>
          </li>
        ))}
      </ul>
      <CustomerBridge inputs={inputs} intFormatter={intFormatter} />
    </div>
  );
};

const CustomerBridge = ({
  inputs,
  intFormatter,
}: {
  inputs: KPIInput;
  intFormatter: Intl.NumberFormat;
}) => {
  const start = inputs.activeCustomersStart ?? null;
  const newCustomers = inputs.newCustomersPerPeriod ?? null;
  let derivedChurned: number | null = null;
  if (inputs.churnedCustomersPerPeriod != null) {
    derivedChurned = inputs.churnedCustomersPerPeriod;
  } else if (
    inputs.retainedCustomersFromStartAtEnd != null &&
    inputs.activeCustomersStart != null
  ) {
    derivedChurned = inputs.activeCustomersStart - inputs.retainedCustomersFromStartAtEnd;
  }
  const derivedEnd =
    start != null && newCustomers != null && derivedChurned != null
      ? start + newCustomers - derivedChurned
      : null;

  const formatInt = (value: number | null) =>
    value == null ? "—" : intFormatter.format(value);

  return (
    <div className="rounded border border-gray-200 bg-white dark:bg-gray-800 p-4 text-sm text-gray-900 dark:text-gray-100">
      <h3 className="font-semibold">Customer Bridge</h3>
      <ul className="mt-2 space-y-1">
        <li className="flex justify-between gap-4">
          <span>Start customers</span>
          <span>{formatInt(start)}</span>
        </li>
        <li className="flex justify-between gap-4">
          <span>+ New customers</span>
          <span>{formatInt(newCustomers)}</span>
        </li>
        <li className="flex justify-between gap-4">
          <span>- Churned customers (derived)</span>
          <span>{formatInt(derivedChurned)}</span>
        </li>
        <li className="flex justify-between gap-4 border-t border-gray-200 pt-1 font-medium">
          <span>= Derived end customers</span>
          <span>{formatInt(derivedEnd)}</span>
        </li>
      </ul>
      {derivedChurned == null && (
        <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">
          Provide churned or retained-from-start customers to unlock the customer bridge.
        </p>
      )}
    </div>
  );
};

const ReportSavePanel = ({
  evaluation,
  warnings,
}: {
  evaluation: Evaluation;
  warnings: string[];
}) => {
  const [title, setTitle] = useState("");
  const [cohortLabel, setCohortLabel] = useState("");
  const [channel, setChannel] = useState("");
  const periodOptions = useMemo(
    () => generatePeriodOptions(evaluation.inputs.period),
    [evaluation.inputs.period],
  );
  const [periodLabel, setPeriodLabel] = useState(
    () => periodOptions[0]?.value ?? defaultPeriodLabelFor(evaluation.inputs.period),
  );
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previousPeriodRef = useRef<KpiPeriod>(evaluation.inputs.period);

  useEffect(() => {
    if (
      previousPeriodRef.current !== evaluation.inputs.period ||
      !periodOptions.some((option) => option.value === periodLabel)
    ) {
      previousPeriodRef.current = evaluation.inputs.period;
      setPeriodLabel(periodOptions[0]?.value ?? defaultPeriodLabelFor(evaluation.inputs.period));
    }
  }, [evaluation.inputs.period, periodLabel, periodOptions]);

  const handleSave = async () => {
    const trimmedLabel = periodLabel.trim();
    if (!trimmedLabel) {
      setError("Period label is required.");
      setMessage(null);
      return;
    }
    setStatus("saving");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          cohortLabel: cohortLabel.trim() || undefined,
          channel: channel.trim() || undefined,
          periodLabel: trimmedLabel,
          inputs: evaluation.inputs,
          results: evaluation.results,
          warnings,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          throw new Error("A report already exists for that period label.");
        }
        throw new Error(data.error ?? "Failed to save report.");
      }
      setMessage("Report saved.");
      setTitle("");
      setCohortLabel("");
      setChannel("");
      setPeriodLabel(
        periodOptions[0]?.value ?? defaultPeriodLabelFor(evaluation.inputs.period),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <section className="rounded border border-gray-200 p-4 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
      <h3 className="font-semibold">Save Report</h3>
      <p className="text-gray-800">
        Optionally tag this report before saving for future analysis.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1">
          Title (optional)
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded border border-gray-300 p-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Cohort label (optional)
          <input
            type="text"
            value={cohortLabel}
            onChange={(e) => setCohortLabel(e.target.value)}
            className="rounded border border-gray-300 p-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          Channel (optional)
          <input
            type="text"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="rounded border border-gray-300 p-2"
          />
        </label>
        <label className="flex flex-col gap-1 md:col-span-3">
          Period label (required)
          <select
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            className="rounded border border-gray-300 p-2"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.display}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-700 dark:text-gray-200">
            Selected range:{" "}
            {
              periodOptions.find((option) => option.value === periodLabel)?.range ??
              "Select a period"
            }
          </span>
        </label>
      </div>
      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving"}
          className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {status === "saving" ? "Saving..." : "Save Report"}
        </button>
        {message && <span className="text-green-700">{message}</span>}
        {error && <span className="text-red-600">{error}</span>}
      </div>
    </section>
  );
};
