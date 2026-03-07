import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { kpiReports, users } from "@/db/schema";
import type { AnyKpiInput, KPIResult, KpiPeriod } from "@/features/kpi/types";

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

const parseMonthly = (label: string) => {
  const [yearStr, monthStr] = label.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
};

const parseQuarterly = (label: string) => {
  const [yearStr, quarterStr] = label.split("-Q");
  const year = Number(yearStr);
  const quarter = Number(quarterStr);
  if (
    Number.isNaN(year) ||
    Number.isNaN(quarter) ||
    quarter < 1 ||
    quarter > 4
  ) {
    return null;
  }
  return { year, quarter };
};

const parseYearly = (label: string) => {
  const year = Number(label);
  return Number.isNaN(year) ? null : { year };
};

const nextMonthly = (year: number, month: number) => {
  const nextMonth = month + 1;
  if (nextMonth > 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: nextMonth };
};

const nextQuarterly = (year: number, quarter: number) => {
  const nextQuarter = quarter + 1;
  if (nextQuarter > 4) {
    return { year: year + 1, quarter: 1 };
  }
  return { year, quarter: nextQuarter };
};

const generateLabelRange = (period: KpiPeriod, labels: string[]) => {
  if (labels.length === 0) {
    return [] as string[];
  }

  if (period === "monthly") {
    const start = parseMonthly(labels[0]);
    const end = parseMonthly(labels[labels.length - 1]);
    if (!start || !end) return labels;
    const all: string[] = [];
    let cursor = { ...start };
    while (
      cursor.year < end.year ||
      (cursor.year === end.year && cursor.month <= end.month)
    ) {
      all.push(`${cursor.year}-${String(cursor.month).padStart(2, "0")}`);
      cursor = nextMonthly(cursor.year, cursor.month);
    }
    return all;
  }

  if (period === "quarterly") {
    const start = parseQuarterly(labels[0]);
    const end = parseQuarterly(labels[labels.length - 1]);
    if (!start || !end) return labels;
    const all: string[] = [];
    let cursor = { ...start };
    while (
      cursor.year < end.year ||
      (cursor.year === end.year && cursor.quarter <= end.quarter)
    ) {
      all.push(`${cursor.year}-Q${cursor.quarter}`);
      cursor = nextQuarterly(cursor.year, cursor.quarter);
    }
    return all;
  }

  const start = parseYearly(labels[0]);
  const end = parseYearly(labels[labels.length - 1]);
  if (!start || !end) return labels;
  const all: string[] = [];
  for (let y = start.year; y <= end.year; y += 1) {
    all.push(String(y));
  }
  return all;
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

  const labels = rows
    .map((row) => row.periodLabel)
    .filter((label): label is string => Boolean(label));

  const alignedLabels = generateLabelRange(parsedPeriod.data, labels);

  const rowMap = new Map(
    rows
      .filter((row) => row.periodLabel)
      .map((row) => [row.periodLabel as string, row]),
  );

  const series = {
    period: parsedPeriod.data as KpiPeriod,
    labels: alignedLabels,
    customersStart: [] as (number | null)[],
    newCustomers: [] as (number | null)[],
    churnRate: [] as (number | null)[],
    retentionRate: [] as (number | null)[],
    cac: [] as (number | null)[],
    arpc: [] as (number | null)[],
    ltgpPerCustomer: [] as (number | null)[],
    ltgpToCacRatio: [] as (number | null)[],
    cacPaybackPeriods: [] as (number | null)[],
    hypotheticalMaxCustomers: [] as (number | null)[],
    hypotheticalMaxRevenuePerYear: [] as (number | null)[],
    hypotheticalMaxProfitPerYear: [] as (number | null)[],
    projectedRevenueNextYear: [] as (number | null)[],
    projectedProfitNextYear: [] as (number | null)[],
  };

  alignedLabels.forEach((label) => {
    const row = rowMap.get(label);
    if (!row) {
      series.customersStart.push(null);
      series.newCustomers.push(null);
      series.churnRate.push(null);
      series.retentionRate.push(null);
      series.cac.push(null);
      series.arpc.push(null);
      series.ltgpPerCustomer.push(null);
      series.ltgpToCacRatio.push(null);
      series.cacPaybackPeriods.push(null);
      series.hypotheticalMaxCustomers.push(null);
      series.hypotheticalMaxRevenuePerYear.push(null);
      series.hypotheticalMaxProfitPerYear.push(null);
      series.projectedRevenueNextYear.push(null);
      series.projectedProfitNextYear.push(null);
      return;
    }

    const input = row.inputJson as AnyKpiInput;
    const result = row.resultJson as KPIResult;

    series.customersStart.push(
      "activeCustomersStart" in input ? input.activeCustomersStart ?? null : null,
    );
    series.newCustomers.push(
      "newCustomersPerPeriod" in input ? input.newCustomersPerPeriod ?? null : null,
    );
    series.churnRate.push(result.churnRate ?? null);
    series.retentionRate.push(result.retentionRate ?? null);
    series.cac.push(result.cac ?? null);
    series.arpc.push(result.arpc ?? null);
    series.ltgpPerCustomer.push(result.ltgpPerCustomer ?? null);
    series.ltgpToCacRatio.push(result.ltgpToCacRatio ?? null);
    series.cacPaybackPeriods.push(result.cacPaybackPeriods ?? null);
    series.hypotheticalMaxCustomers.push(result.hypotheticalMaxCustomers ?? null);
    series.hypotheticalMaxRevenuePerYear.push(
      result.hypotheticalMaxRevenuePerYear ?? null,
    );
    series.hypotheticalMaxProfitPerYear.push(
      result.hypotheticalMaxProfitPerYear ?? null,
    );
    series.projectedRevenueNextYear.push(
      result.projectedRevenueNextYear ??
        result.hypotheticalMaxRevenuePerYear ??
        null,
    );
    series.projectedProfitNextYear.push(
      result.projectedProfitNextYear ??
        result.hypotheticalMaxProfitPerYear ??
        null,
    );
  });

  return NextResponse.json({ series }, { status: 200 });
};
