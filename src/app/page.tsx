"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";

import AppHeader from "@/components/home/AppHeader";
import DecisionCards from "@/components/home/DecisionCards";
import HealthSummaryCard from "@/components/home/HealthSummaryCard";
import HeroSection from "@/components/home/HeroSection";
import OfferWorkspace from "@/components/home/OfferWorkspace";
import ReportsDashboard from "@/components/home/ReportsDashboard";
import ResultsSections from "@/components/home/ResultsSections";
import SaveReportCard from "@/components/home/SaveReportCard";
import SampleDataControls from "@/components/home/SampleDataControls";
import WorkspaceViewSelector from "@/components/home/WorkspaceViewSelector";
import GitHubSignInButton from "@/components/GitHubSignInButton";
import type { ReportSummary } from "@/components/report-comparison";
import type { KpiEvaluation } from "@/features/kpi/types";
import type { NormalizedOfferPeriodSnapshot } from "@/features/integrations/types";
import {
  createDefaultOfferInput,
  sampleKpiInput,
  type KPIInputState,
  type ReportSeries,
} from "@/components/home/types";
import { generateSampleYearReports } from "@/lib/sampleReports";

type FormState = KPIInputState;
type Evaluation = KpiEvaluation<KPIInputState>;

type SessionSnapshot = {
  user?: {
    email?: string | null;
  };
} | null;

type WorkspaceView = "offer_inputs" | "reports";

const defaultState: FormState = createDefaultOfferInput("software_subscription");

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
  const [importedSnapshots, setImportedSnapshots] = useState<
    NormalizedOfferPeriodSnapshot[]
  >([]);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [importedSeedStatus, setImportedSeedStatus] = useState<string | null>(null);
  const [isSeedingImportedData, setIsSeedingImportedData] = useState(false);
  const [activeWorkspaceView, setActiveWorkspaceView] =
    useState<WorkspaceView>("offer_inputs");

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

  const loadImportedSnapshots = useCallback(async () => {
    if (!sessionEmail) {
      setImportedSnapshots([]);
      setSnapshotsError(null);
      return;
    }
    try {
      const response = await fetch("/api/integrations/snapshots");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Unable to load imported snapshots.");
      }
      const data = (await response.json()) as {
        snapshots: NormalizedOfferPeriodSnapshot[];
      };
      setImportedSnapshots(data.snapshots ?? []);
      setSnapshotsError(null);
    } catch (err) {
      setSnapshotsError(
        err instanceof Error ? err.message : "Unknown snapshot error.",
      );
      setImportedSnapshots([]);
    }
  }, [sessionEmail]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    void loadSeries();
  }, [loadSeries]);

  useEffect(() => {
    void loadImportedSnapshots();
  }, [loadImportedSnapshots]);

  const refreshReports = async () => {
    await Promise.all([loadReports(), loadSeries(), loadImportedSnapshots()]);
  };

  const handleCalculate = async () => {
    const grossMarginError =
      "grossProfitInputMode" in form &&
      (form.grossProfitInputMode ?? "margin") === "margin" &&
      "grossMargin" in form &&
      form.grossMargin != null &&
      form.grossMargin > 1
        ? "Gross margin cannot exceed 1.0 (100%)."
        : null;
    if (grossMarginError) {
      setError(grossMarginError);
      return false;
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
        return false;
      }

      const data = (await response.json()) as Evaluation;
      setEvaluation(data);
      setWarnings(data.warnings ?? []);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
      return false;
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
    const reset = createDefaultOfferInput(form.offerType);
    reset.analysisPeriod = form.analysisPeriod;
    setForm(reset);
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

  const handleSeedSampleStripeImport = async () => {
    if (!sessionEmail) {
      setImportedSeedStatus("Sign in required.");
      return;
    }
    if (isSeedingImportedData) {
      return;
    }

    setIsSeedingImportedData(true);
    setImportedSeedStatus("Loading sample Stripe-style import...");

    try {
      const response = await fetch("/api/integrations/stripe/sample", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Unable to load sample Stripe import.");
      }

      const data = (await response.json()) as {
        createdYear: number;
        summary: {
          syncCount: number;
          snapshotCount: number;
          offerCount: number;
        };
      };

      setImportedSeedStatus(
        `Loaded sample Stripe-style data for ${data.createdYear}: ${data.summary.snapshotCount} snapshots across ${data.summary.offerCount} offers.`,
      );
      await refreshReports();
    } catch (err) {
      setImportedSeedStatus(
        err instanceof Error ? err.message : "Unable to load sample Stripe import.",
      );
    } finally {
      setIsSeedingImportedData(false);
    }
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

  const workspaceViews = [
    {
      id: "offer_inputs",
      label: "Offer Inputs",
      description: "Configure the offer, run scenarios, and save a snapshot.",
    },
    {
      id: "reports",
      label: "Reports",
      description: "Review saved snapshots, trends, and report history.",
    },
  ] satisfies Array<{
    id: WorkspaceView;
    label: string;
    description: string;
  }>;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 pb-16 pt-6 text-white sm:px-6 lg:px-8">
      <AppHeader
        hero="Offer Engine"
        sidekick="Software Economics Console"
        description="Analyze software subscription economics with the same numbers operators use to judge growth quality."
        sessionEmail={sessionEmail}
        onSignIn={() => void signIn("github", { callbackUrl: "/" })}
        onSignOut={() => void handleSignOut()}
        signInCta={<GitHubSignInButton callbackUrl="/" />}
      />

      <HeroSection
        input={form}
        results={evaluation?.results ?? null}
        analysisPeriod={form.analysisPeriod}
      />

      <div className="space-y-6">
        <WorkspaceViewSelector
          activeView={activeWorkspaceView}
          options={workspaceViews}
          onSelect={setActiveWorkspaceView}
        />

        {activeWorkspaceView === "offer_inputs" ? (
          <section className="space-y-6">
            <OfferWorkspace
              value={form}
              onChange={setForm}
              onCalculate={handleCalculate}
              isCalculating={isSubmitting}
              error={error}
              onGuidedComplete={() => setActiveWorkspaceView("reports")}
              headerActions={
                <SampleDataControls
                  onLoadSample={handleLoadSample}
                  onClear={handleClear}
                />
              }
            />
          </section>
        ) : (
          <section className="space-y-6">
            <section className="panel-shell rounded-[28px] p-5">
              <div className="border-b border-white/8 pb-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/34">
                  Current Scenario
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  Decision output
                </h2>
                <p className="mt-1 text-sm text-white/58">
                  Review the current calculation, save the scenario, and compare it
                  against your report history in one place.
                </p>
              </div>

              {error && (
                <div className="mt-4 rounded-[22px] border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  {error}
                </div>
              )}

              {evaluation ? (
                <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
                  <div className="space-y-5">
                    <HealthSummaryCard evaluation={evaluation} />
                    <DecisionCards results={evaluation.results} />
                    <ResultsSections
                      results={evaluation.results}
                      warnings={warnings}
                      inputs={evaluation.inputs}
                    />
                  </div>
                  <SaveReportCard evaluation={evaluation} warnings={warnings} />
                </div>
              ) : (
                <div className="panel-subtle mt-5 rounded-[22px] p-5 text-sm text-white/58">
                  Run a scenario from <span className="font-medium text-white">Offer Inputs</span>{" "}
                  to populate the current decision output here.
                </div>
              )}
            </section>

            <ReportsDashboard
              isSignedIn={Boolean(sessionEmail)}
              reports={reports}
              selectedReport={selectedReport}
              onSelectReport={(id) => setSelectedReportId(id)}
              onRefresh={refreshReports}
              series={series}
              importedSnapshots={importedSnapshots}
              snapshotsError={snapshotsError}
              reportsError={reportsError}
              seriesError={seriesError}
              signInCta={<GitHubSignInButton callbackUrl="/" />}
              onSeedSampleYear={handleLoadSampleYear}
              onSeedSampleStripeImport={handleSeedSampleStripeImport}
              isSeeding={isSeeding}
              isSeedingImportedData={isSeedingImportedData}
              seedStatus={seedStatus}
              importedSeedStatus={importedSeedStatus}
              onDeleteReport={handleDeleteReport}
            />
          </section>
        )}
      </div>

      <details className="rounded-[26px] border border-white/10 bg-[var(--surface-1)] p-5">
        <summary className="cursor-pointer font-semibold">
          What these metrics mean
        </summary>
        <div className="mt-3 space-y-2 text-sm text-white/64">
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
