import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { asc, eq } from "drizzle-orm";

import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { kpiReports, users } from "@/db/schema";
import type { KPIInput, KPIResult } from "@/features/kpi/types";

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

export const GET = async () => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userId = await ensureUser(session);
  if (!userId) {
    return NextResponse.json({ error: "Unable to resolve user." }, { status: 401 });
  }

  const rows = await db
    .select({
      createdAt: kpiReports.createdAt,
      inputJson: kpiReports.inputJson,
      resultJson: kpiReports.resultJson,
    })
    .from(kpiReports)
    .where(eq(kpiReports.userId, userId))
    .orderBy(asc(kpiReports.createdAt));

  const series = {
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

    series.dates.push(row.createdAt ? row.createdAt.toISOString() : null);
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
