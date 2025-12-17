import { getServerSession } from "next-auth";
import { desc, eq } from "drizzle-orm";

import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { kpiReports, users } from "@/db/schema";
import type { KPIInput, KPIResult } from "@/features/kpi/types";
import type { ReportSummary } from "@/components/report-comparison";
import { ReportComparison } from "@/components/report-comparison";

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
        <p className="text-gray-600">Please sign in to view saved reports.</p>
      </main>
    );
  }

  const userId = await resolveUserId(session.user?.email ?? null);

  if (!userId) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Saved Reports</h1>
        <p className="text-gray-600">No saved reports yet.</p>
      </main>
    );
  }

  const rows = await db
    .select({
      id: kpiReports.id,
      title: kpiReports.title,
      createdAt: kpiReports.createdAt,
      period: kpiReports.period,
      businessModel: kpiReports.businessModel,
      inputJson: kpiReports.inputJson,
      resultJson: kpiReports.resultJson,
      warningsJson: kpiReports.warningsJson,
    })
    .from(kpiReports)
    .where(eq(kpiReports.userId, userId))
    .orderBy(desc(kpiReports.createdAt));

  const reports = rows.map((row) => ({
    ...row,
    inputJson: row.inputJson as KPIInput,
    resultJson: row.resultJson as KPIResult,
    warningsJson: (row.warningsJson as string[]) ?? [],
  }));

  const summaries: ReportSummary[] = reports.map((report) => ({
    id: report.id,
    title: report.title,
    createdAt: report.createdAt,
    period: report.period,
    businessModel: report.businessModel,
    inputJson: report.inputJson,
    resultJson: report.resultJson,
    warningsJson: report.warningsJson,
  }));

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Saved Reports</h1>
      {reports.length === 0 ? (
        <p className="text-gray-600">No saved reports yet.</p>
      ) : (
        <>
          <ReportComparison reports={summaries} />
          <ul className="space-y-4">
            {reports.map((report) => (
              <li key={report.id} className="rounded border border-gray-200 p-4">
                <details>
                  <summary className="cursor-pointer font-medium">
                    {report.title ?? "Untitled"} — {report.period} /{" "}
                    {report.businessModel} (
                    {report.createdAt
                      ? new Date(report.createdAt).toLocaleString()
                      : "unknown"}
                    )
                  </summary>
                  <div className="mt-3 space-y-2 text-sm">
                    <div>
                      <h3 className="font-semibold">Inputs</h3>
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
