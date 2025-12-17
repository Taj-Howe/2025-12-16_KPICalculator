import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { kpiReports, users } from "@/db/schema";
import type { KPIInput, KPIResult, KpiPeriod } from "@/features/kpi/types";

const ensureUser = async (session: Session) => {
  const email = session.user?.email;
  if (!email) {
    return null;
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const inserted = await db
    .insert(users)
    .values({
      email,
      name: session.user?.name ?? null,
      image: session.user?.image ?? null,
    })
    .returning({ id: users.id });

  return inserted[0]?.id ?? null;
};

const periodParamSchema = z.enum(["monthly", "quarterly", "yearly"]);

const labelToDateIso = (period: KpiPeriod, label: string): string | null => {
  try {
    if (period === "monthly") {
      const [year, month] = label.split("-");
      if (!year || !month) return null;
      const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
      return date.toISOString();
    }

    if (period === "quarterly") {
      const [year, quarter] = label.split("-Q");
      if (!year || !quarter) return null;
      const quarterIndex = Number(quarter) - 1;
      if (quarterIndex < 0 || quarterIndex > 3) {
        return null;
      }
      const month = quarterIndex * 3;
      const date = new Date(Date.UTC(Number(year), month, 1));
      return date.toISOString();
    }

    if (period === "yearly") {
      const year = Number(label);
      if (Number.isNaN(year)) {
        return null;
      }
      const date = new Date(Date.UTC(year, 0, 1));
      return date.toISOString();
    }

    return null;
  } catch {
    return null;
  }
};

export const GET = async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userId = await ensureUser(session);
  if (!userId) {
    return NextResponse.json({ error: "Unable to resolve user." }, { status: 401 });
  }

  const url = new URL(request.url);
  const periodParam = (url.searchParams.get("period") ?? "monthly") as KpiPeriod;
  const parsedPeriod = periodParamSchema.safeParse(periodParam);
  if (!parsedPeriod.success) {
    return NextResponse.json(
      { error: "Invalid period parameter. Use monthly, quarterly, or yearly." },
      { status: 400 },
    );
  }

  const rows = await db
    .select({
      periodLabel: kpiReports.periodLabel,
      inputJson: kpiReports.inputJson,
      resultJson: kpiReports.resultJson,
    })
    .from(kpiReports)
    .where(
      and(
        eq(kpiReports.userId, userId),
        eq(kpiReports.period, parsedPeriod.data),
        isNotNull(kpiReports.periodLabel),
      ),
    )
    .orderBy(asc(kpiReports.periodLabel));

  const series = {
    period: parsedPeriod.data as KpiPeriod,
    labels: [] as string[],
    dates: [] as (string | null)[],
    customersStart: [] as (number | null)[],
    newCustomers: [] as (number | null)[],
    churnRate: [] as (number | null)[],
    retentionRate: [] as (number | null)[],
    cac: [] as (number | null)[],
    arpc: [] as (number | null)[],
    ltgpPerCustomer: [] as (number | null)[],
    ltgpToCacRatio: [] as (number | null)[],
    cacPaybackPeriods: [] as (number | null)[],
    maxRevenuePerYear: [] as (number | null)[],
    maxProfitPerYear: [] as (number | null)[],
  };

  rows.forEach((row) => {
    const input = row.inputJson as KPIInput;
    const result = row.resultJson as KPIResult;

    const label = row.periodLabel ?? "";
    series.labels.push(label);
    series.dates.push(labelToDateIso(parsedPeriod.data, label));
    series.customersStart.push(input.activeCustomersStart ?? null);
    series.newCustomers.push(input.newCustomersPerPeriod ?? null);
    series.churnRate.push(result.churnRate ?? null);
    series.retentionRate.push(result.retentionRate ?? null);
    series.cac.push(result.cac ?? null);
    series.arpc.push(result.arpc ?? null);
    series.ltgpPerCustomer.push(result.ltgpPerCustomer ?? null);
    series.ltgpToCacRatio.push(result.ltgpToCacRatio ?? null);
    series.cacPaybackPeriods.push(result.cacPaybackPeriods ?? null);
    series.maxRevenuePerYear.push(result.hypotheticalMaxRevenuePerYear ?? null);
    series.maxProfitPerYear.push(result.hypotheticalMaxProfitPerYear ?? null);
  });

  return NextResponse.json({ series }, { status: 200 });
};
