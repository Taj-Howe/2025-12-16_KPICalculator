import { getServerSession } from "next-auth";
import { desc, eq } from "drizzle-orm";

import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { kpiReports, users } from "@/db/schema";
import type { AnyKpiInput, KPIResult } from "@/features/kpi/types";
import type { ReportSummary } from "@/components/report-comparison";
import { ReportComparison } from "@/components/report-comparison";
import { ReportTrends } from "@/components/report-trends";

const resolveUserId = async (email: string | null | undefined) => {
  if (!email) {
    return null;
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return existing[0]?.id ?? null;
};

const DashboardPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Saved Reports</h1>
        <p className="text-gray-700 dark:text-gray-300">
          Please sign in to view saved reports.
        </p>
      </main>
    );
  }

  const userId = await resolveUserId(session.user?.email ?? null);

  if (!userId) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Saved Reports</h1>
        <p className="text-gray-700 dark:text-gray-300">
          No saved reports yet.
        </p>
      </main>
    );
  }

  const rows = await db
    .select({
      id: kpiReports.id,
      title: kpiReports.title,
      cohortLabel: kpiReports.cohortLabel,
      channel: kpiReports.channel,
      periodLabel: kpiReports.periodLabel,
      createdAt: kpiReports.createdAt,
      period: kpiReports.period,
      businessModel: kpiReports.businessModel,
      offerId: kpiReports.offerId,
      offerName: kpiReports.offerName,
      offerType: kpiReports.offerType,
      calculationVersion: kpiReports.calculationVersion,
      inputJson: kpiReports.inputJson,
      resultJson: kpiReports.resultJson,
      warningsJson: kpiReports.warningsJson,
    })
    .from(kpiReports)
    .where(eq(kpiReports.userId, userId))
    .orderBy(desc(kpiReports.createdAt));

  const reports = rows.map((row) => ({
    ...row,
    inputJson: row.inputJson as AnyKpiInput,
    resultJson: row.resultJson as KPIResult,
    warningsJson: (row.warningsJson as string[]) ?? [],
  }));

  const summaries: ReportSummary[] = reports.map((report) => ({
    id: report.id,
    title: report.title,
    cohortLabel: report.cohortLabel,
    channel: report.channel,
    periodLabel: report.periodLabel,
    createdAt: report.createdAt,
    period: report.period,
    businessModel: report.businessModel,
    offerId: report.offerId,
    offerName: report.offerName,
    offerType: report.offerType,
    calculationVersion: report.calculationVersion,
    inputJson: report.inputJson,
    resultJson: report.resultJson,
    warningsJson: report.warningsJson,
  }));
  const describeReport = (report: (typeof reports)[number]) =>
    report.offerName?.trim() || report.title?.trim() || "Untitled";
  const describeType = (report: (typeof reports)[number]) =>
    report.offerType ?? report.businessModel;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Saved Reports</h1>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Each saved report must include a <strong className="font-semibold">period label</strong>.
        Unlabeled reports stay visible below but do not appear in trends.
      </p>
      {reports.length === 0 ? (
        <p className="text-gray-700 dark:text-gray-300">
          No saved reports yet.
        </p>
      ) : (
        <>
          <ReportTrends />
          <ReportComparison reports={summaries} />
          <ul className="space-y-4">
            {reports.map((report) => (
              <li key={report.id} className="rounded border border-gray-200 p-4">
                <details>
                  <summary className="cursor-pointer font-medium">
                    {describeReport(report)} —{" "}
                    {report.periodLabel ?? "Unlabeled"} ({report.period} /{" "}
                    {describeType(report)}) (
                    {report.createdAt
                      ? new Date(report.createdAt).toLocaleString()
                      : "unknown"}
                    )
                  </summary>
                  <div className="mt-3 space-y-2 text-sm">
                    {(report.cohortLabel || report.channel) && (
                      <div className="text-gray-700 dark:text-gray-200">
                        {report.cohortLabel && (
                          <p>
                            <span className="font-semibold">Cohort:</span>{" "}
                            {report.cohortLabel}
                          </p>
                        )}
                        {report.channel && (
                          <p>
                            <span className="font-semibold">Channel:</span>{" "}
                            {report.channel}
                          </p>
                        )}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">Inputs</h3>
                      {report.periodLabel == null && (
                        <p className="text-xs text-yellow-700">
                          This report has no period label and will be excluded from trends.
                        </p>
                      )}
                      <pre className="overflow-auto rounded bg-gray-50 p-2">
                        {JSON.stringify(report.inputJson, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h3 className="font-semibold">Results</h3>
                      <pre className="overflow-auto rounded bg-gray-50 p-2">
                        {JSON.stringify(report.resultJson, null, 2)}
                      </pre>
                    </div>
                    {report.calculationVersion && (
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Calculation version: {report.calculationVersion}
                      </p>
                    )}
                    {report.warningsJson.length > 0 && (
                      <div>
                        <h3 className="font-semibold">Warnings</h3>
                        <ul className="list-disc pl-5">
                          {report.warningsJson.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
};

export default DashboardPage;
