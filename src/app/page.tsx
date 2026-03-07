"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";

import AppHeader from "@/components/home/AppHeader";
import KpiInputPanel from "@/components/home/KpiInputPanel";
import ReportsPanel from "@/components/home/ReportsPanel";
import SampleDataControls from "@/components/home/SampleDataControls";
import GitHubSignInButton from "@/components/GitHubSignInButton";
import type { ReportSummary } from "@/components/report-comparison";
import type {
  CalculationVersion,
  KPIResult,
  KpiPeriod,
  OfferInput,
} from "@/features/kpi/types";
import { sampleKpiInput } from "@/components/home/types";
import type { ReportSeries } from "@/components/home/types";
import { generateSampleYearReports } from "@/lib/sampleReports";

type FormState = OfferInput;
type Evaluation = {
  inputs: OfferInput;
  results: KPIResult;
  calculationVersion: CalculationVersion;
  assumptionsApplied: string[];
};

type SessionSnapshot = {
  user?: {
    email?: string | null;
  };
} | null;

const defaultState: FormState = {
  offerId: "main-offer",
  offerName: "Main Offer",
  offerType: "subscription",
  analysisPeriod: "monthly",
  revenueInputMode: "total_revenue",
  grossProfitInputMode: "margin",
  cacInputMode: "derived",
  retentionInputMode: "counts",
  revenuePerPeriod: 100000,
  grossMargin: 0.7,
  marketingSpendPerPeriod: 20000,
  newCustomersPerPeriod: 20,
  activeCustomersStart: 100,
  retainedCustomersFromStartAtEnd: 90,
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
  date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

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
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [series, setSeries] = useState<ReportSeries | null>(null);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [seriesError, setSeriesError] = useState<string | null>(null);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const selectedReport =
    selectedReportId == null
      ? null
      : reports.find((report) => report.id === selectedReportId) ?? null;

  const loadSession = async () => {
    try {
      const response = await fetch("/api/auth/session");
      if (!response.ok) {
        setSessionEmail(null);
        return;
      }
      const data = (await response.json()) as SessionSnapshot;
      setSessionEmail(data?.user?.email ?? null);
    } catch {
      setSessionEmail(null);
    }
  };

  useEffect(() => {
    void loadSession();
  }, []);

  const loadReports = useCallback(async () => {
    if (!sessionEmail) {
      setReports([]);
      setSelectedReportId(null);
      setReportsError(null);
      return;
    }
    try {
      const response = await fetch("/api/reports");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Unable to load reports.");
      }
      const data = (await response.json()) as { reports: ReportSummary[] };
      setReports(data.reports ?? []);
      setReportsError(null);
      setSelectedReportId((prev) => {
        if (!data.reports?.length) {
          return null;
        }
        const exists = data.reports.some((report) => report.id === prev);
        return exists ? prev : data.reports[0]?.id ?? null;
      });
    } catch (err) {
      setReportsError(err instanceof Error ? err.message : "Unknown error.");
      setReports([]);
      setSelectedReportId(null);
    }
  }, [sessionEmail]);

  const loadSeries = useCallback(async () => {
    if (!sessionEmail) {
      setSeries(null);
      setSeriesError(null);
      return;
    }
    try {
      const response = await fetch(
        `/api/reports/series?period=${form.analysisPeriod}`,
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Unable to load report trends.");
      }
      const data = (await response.json()) as { series: ReportSeries };
      setSeries(data.series ?? null);
      setSeriesError(null);
    } catch (err) {
      setSeriesError(err instanceof Error ? err.message : "Unknown error.");
      setSeries(null);
    }
  }, [form.analysisPeriod, sessionEmail]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    void loadSeries();
  }, [loadSeries]);

  const refreshReports = async () => {
    await Promise.all([loadReports(), loadSeries()]);
  };

  const handleCalculate = async () => {
    const grossMarginError =
      (form.grossProfitInputMode ?? "margin") === "margin" &&
      form.grossMargin != null && form.grossMargin > 1
        ? "Gross margin cannot exceed 1.0 (100%)."
        : null;
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
      setEvaluation({
        inputs: data.inputs,
        results: data.results,
        calculationVersion: data.calculationVersion,
        assumptionsApplied: data.assumptionsApplied ?? [],
      });
      setWarnings(data.warnings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadSample = () => {
    setForm(sampleKpiInput);
    setEvaluation(null);
    setWarnings([]);
    setError(null);
  };

  const handleClear = () => {
    setForm({
      offerId: form.offerId,
      offerName: form.offerName,
      offerType: form.offerType,
      analysisPeriod: form.analysisPeriod,
      revenueInputMode: form.revenueInputMode ?? "total_revenue",
      grossProfitInputMode: form.grossProfitInputMode ?? "margin",
      cacInputMode: form.cacInputMode ?? "derived",
      retentionInputMode: form.retentionInputMode ?? "counts",
      revenuePerPeriod:
        (form.revenueInputMode ?? "total_revenue") === "total_revenue"
          ? 0
          : undefined,
      directArpc:
        (form.revenueInputMode ?? "total_revenue") === "direct_arpc"
          ? 0
          : undefined,
      grossMargin:
        (form.grossProfitInputMode ?? "margin") === "margin" ? 0 : undefined,
      deliveryCostPerCustomerPerPeriod:
        (form.grossProfitInputMode ?? "margin") === "costs" ? 0 : undefined,
      fixedDeliveryCostPerPeriod:
        (form.grossProfitInputMode ?? "margin") === "costs" ? 0 : undefined,
      marketingSpendPerPeriod:
        (form.cacInputMode ?? "derived") === "derived" ? 0 : undefined,
      directCac:
        (form.cacInputMode ?? "derived") === "direct" ? 0 : undefined,
      newCustomersPerPeriod: 0,
      activeCustomersStart:
        (form.retentionInputMode ?? "counts") === "counts" ||
        (form.revenueInputMode ?? "total_revenue") === "total_revenue"
          ? 0
          : undefined,
      directChurnRatePerPeriod:
        (form.retentionInputMode ?? "counts") === "rate" ? 0 : undefined,
    });
    setEvaluation(null);
    setWarnings([]);
    setError(null);
  };

  const handleLoadSampleYear = async () => {
    if (!sessionEmail) {
      setSeedStatus("Sign in required.");
      return;
    }
    if (isSeeding) {
      return;
    }
    setIsSeeding(true);
    setSeedStatus("Preparing 12 monthly reports...");
    const year = new Date().getFullYear();
    const payloads = generateSampleYearReports(year);

    let created = 0;
    for (let i = 0; i < payloads.length; i += 1) {
      const payload = payloads[i];
      setSeedStatus(`Creating ${i + 1}/12...`);
      try {
        const response = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          created += 1;
        } else if (response.status === 409) {
          continue;
        } else {
          const data = await response.json();
          setSeedStatus(
            data.error ?? "Some reports could not be created.",
          );
        }
      } catch {
        setSeedStatus("Unable to create sample reports.");
      }
    }

    setSeedStatus(
      created > 0
        ? `Created ${created}/12 reports.`
        : "No new reports created (already existed).",
    );
    await refreshReports();
    setIsSeeding(false);
  };

  const handleDeleteReport = async (id: number) => {
    const confirmed = window.confirm(
      "Delete this report? This cannot be undone.",
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
      });
      if (response.status === 401) {
        window.location.href = "/signin?callbackUrl=/";
        return;
      }
      if (!response.ok) {
        const data = await response.json();
        setReportsError(data.error ?? "Unable to delete report.");
        return;
      }
      setSelectedReportId(null);
      await refreshReports();
    } catch {
      setReportsError("Unable to delete report.");
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    await loadSession();
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 bg-black p-6 text-white">
      <AppHeader
        hero="KPI Calculator"
        sidekick="Business KPI"
        description="Run quick KPI scenarios and save snapshots with a single consistent period."
        sessionEmail={sessionEmail}
        onSignIn={() => void signIn("github", { callbackUrl: "/" })}
        onSignOut={() => void handleSignOut()}
        signInCta={<GitHubSignInButton callbackUrl="/" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <KpiInputPanel
            value={form}
            onChange={setForm}
            onCalculate={handleCalculate}
            isCalculating={isSubmitting}
            results={evaluation?.results ?? null}
            warnings={warnings}
          >
            <SampleDataControls
              onLoadSample={handleLoadSample}
              onClear={handleClear}
            />
          </KpiInputPanel>

          {error && <p className="text-white/80">{error}</p>}

          {evaluation && (
            <ReportSavePanel evaluation={evaluation} warnings={warnings} />
          )}
        </div>

        <div className="space-y-6">
          <ReportsPanel
            isSignedIn={Boolean(sessionEmail)}
            reports={reports}
            selectedReport={selectedReport}
            onSelectReport={(id) => setSelectedReportId(id)}
            onRefresh={refreshReports}
            series={series}
            signInCta={<GitHubSignInButton callbackUrl="/" />}
            onSeedSampleYear={handleLoadSampleYear}
            isSeeding={isSeeding}
            seedStatus={seedStatus}
            onDeleteReport={handleDeleteReport}
          />

          {reportsError && (
            <p className="text-sm text-white/80">{reportsError}</p>
          )}
          {seriesError && (
            <p className="text-sm text-white/80">{seriesError}</p>
          )}
        </div>
      </div>

      <details className="rounded border border-white/30 p-4">
        <summary className="cursor-pointer font-semibold">
          What these metrics mean
        </summary>
        <div className="mt-3 space-y-2 text-sm text-white/80">
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
              <strong>Churn rate</strong>: Portion of starting customers lost during the period.
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
    </main>
  );
}


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
    () => generatePeriodOptions(evaluation.inputs.analysisPeriod),
    [evaluation.inputs.analysisPeriod],
  );
  const [periodLabel, setPeriodLabel] = useState(
    () =>
      periodOptions[0]?.value ??
      defaultPeriodLabelFor(evaluation.inputs.analysisPeriod),
  );
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previousPeriodRef = useRef<KpiPeriod>(evaluation.inputs.analysisPeriod);

  useEffect(() => {
    if (
      previousPeriodRef.current !== evaluation.inputs.analysisPeriod ||
      !periodOptions.some((option) => option.value === periodLabel)
    ) {
      previousPeriodRef.current = evaluation.inputs.analysisPeriod;
      setPeriodLabel(
        periodOptions[0]?.value ??
          defaultPeriodLabelFor(evaluation.inputs.analysisPeriod),
      );
    }
  }, [evaluation.inputs.analysisPeriod, periodLabel, periodOptions]);

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
          calculationVersion: evaluation.calculationVersion,
          assumptionsApplied: evaluation.assumptionsApplied,
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
        periodOptions[0]?.value ??
          defaultPeriodLabelFor(evaluation.inputs.analysisPeriod),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <section className="rounded border border-white/30 bg-black p-4 text-sm text-white">
      <h3 className="font-semibold">Save Report</h3>
      <p className="text-white/80">
        Optionally tag this report before saving for future analysis.
      </p>
      <div className="mt-2 text-xs text-white/60">
        <p>Calculation version: {evaluation.calculationVersion}</p>
        {evaluation.assumptionsApplied.length > 0 && (
          <p>Assumptions: {evaluation.assumptionsApplied.join(" | ")}</p>
        )}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1">
          Title (optional)
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded border border-white/30 bg-black p-2 text-white"
          />
        </label>
        <label className="flex flex-col gap-1">
          Cohort label (optional)
          <input
            type="text"
            value={cohortLabel}
            onChange={(e) => setCohortLabel(e.target.value)}
            className="rounded border border-white/30 bg-black p-2 text-white"
          />
        </label>
        <label className="flex flex-col gap-1">
          Channel (optional)
          <input
            type="text"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="rounded border border-white/30 bg-black p-2 text-white"
          />
        </label>
        <label className="flex flex-col gap-1 md:col-span-3">
          Period label (required)
          <select
            value={periodLabel}
            onChange={(e) => setPeriodLabel(e.target.value)}
            className="rounded border border-white/30 bg-black p-2 text-white"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.display}
              </option>
            ))}
          </select>
          <span className="text-xs text-white/70">
            Selected range:{" "}
            {periodOptions.find((option) => option.value === periodLabel)?.range ??
              "Select a period"}
          </span>
        </label>
      </div>
      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving"}
          className="rounded border border-white/60 px-4 py-2 text-white disabled:opacity-50"
        >
          {status === "saving" ? "Saving..." : "Save Report"}
        </button>
        {message && <span className="text-white/80">{message}</span>}
        {error && <span className="text-white/80">{error}</span>}
      </div>
    </section>
  );
};
