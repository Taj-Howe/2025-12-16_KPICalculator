import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { ZodError, z } from "zod";
import { asc, eq, sql } from "drizzle-orm";

import { authOptions } from "@/lib/auth";
import { kpiInputSchema } from "@/features/kpi/schema";
import { getInputModelLabel, getInputPeriod, getOfferMetadata, isLegacyKpiInput } from "@/features/kpi/adapters";
import type { AnyKpiInput, CalculationVersion, KPIResult } from "@/features/kpi/types";
import { db } from "@/db";
import { kpiReports, users } from "@/db/schema";
import { validatePeriodLabel } from "@/lib/periodLabel";

const numberOrNull = z.number().nullable();

const resultsSchema: z.ZodType<KPIResult> = z.object({
  cac: numberOrNull,
  arpc: numberOrNull,
  churnRate: numberOrNull,
  retentionRate: numberOrNull,
  ltv: numberOrNull,
  ltgpPerCustomer: numberOrNull,
  ltgpToCacRatio: numberOrNull,
  cacPaybackPeriods: numberOrNull,
  hypotheticalMaxRevenuePerYear: numberOrNull,
  hypotheticalMaxProfitPerYear: numberOrNull,
  car: numberOrNull,
});

const saveReportSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  cohortLabel: z.string().trim().min(1).max(120).optional(),
  channel: z.string().trim().min(1).max(120).optional(),
  periodLabel: z.string().trim().min(1).max(20),
  inputs: kpiInputSchema,
  results: resultsSchema,
  warnings: z.array(z.string()),
  calculationVersion: z
    .enum([
      "kpi-v1-legacy-model",
      "kpi-v2-subscription-offer",
      "kpi-v2-subscription-offer-flexible-inputs",
    ])
    .optional(),
  assumptionsApplied: z.array(z.string()).optional(),
});

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

export const POST = async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userId = await ensureUser(session);
  if (!userId) {
    return NextResponse.json({ error: "Unable to resolve user." }, { status: 401 });
  }

  const json = await request.json();
  const parsed = saveReportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid report payload.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const input = data.inputs as AnyKpiInput;
  const period = getInputPeriod(input);
  const businessModel = getInputModelLabel(input);
  const offerMetadata = getOfferMetadata(input);
  const calculationVersion: CalculationVersion =
    data.calculationVersion ??
    (isLegacyKpiInput(input) ? "kpi-v1-legacy-model" : "kpi-v2-subscription-offer");
  const assumptionsApplied = data.assumptionsApplied ?? [];

  let normalizedLabel: string;
  try {
    normalizedLabel = validatePeriodLabel(
      period,
      data.periodLabel.trim(),
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues?.[0]?.message ?? "Invalid periodLabel." },
        { status: 400 },
      );
    }
    throw error;
  }

  try {
    const [report] = await db
      .insert(kpiReports)
      .values({
        userId,
        title: data.title ?? null,
        cohortLabel: data.cohortLabel ?? null,
        channel: data.channel ?? null,
        period,
        periodLabel: normalizedLabel,
        businessModel,
        offerId: offerMetadata.offerId,
        offerName: offerMetadata.offerName,
        offerType: offerMetadata.offerType,
        calculationVersion,
        inputJson: data.inputs,
        resultJson: {
          ...data.results,
          calculationVersion,
          assumptionsApplied,
        },
        warningsJson: data.warnings,
      })
      .returning({
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
      });

    return NextResponse.json(
      {
        report,
        calculationVersion,
        assumptionsApplied,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "A report already exists for this period label." },
        { status: 409 },
      );
    }
    throw error;
  }
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

  const reports = await db
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
    .orderBy(
      asc(sql`CASE WHEN ${kpiReports.periodLabel} IS NULL THEN 1 ELSE 0 END`),
      asc(kpiReports.periodLabel),
      asc(kpiReports.createdAt),
    );

  const serialized = reports.map((report) => ({
    ...report,
    createdAt: report.createdAt ? report.createdAt.toISOString() : null,
  }));

  return NextResponse.json({ reports: serialized }, { status: 200 });
};

export const DELETE = async (request: Request) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userId = await ensureUser(session);
  if (!userId) {
    return NextResponse.json({ error: "Unable to resolve user." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const year = typeof json?.year === "number" ? json.year : null;
  if (!year) {
    return NextResponse.json({ error: "Year is required." }, { status: 400 });
  }

  const labelPrefix = `${year}-`;
  const deleted = await db
    .delete(kpiReports)
    .where(
      sql`${kpiReports.userId} = ${userId}
        AND ${kpiReports.period} = 'monthly'
        AND ${kpiReports.channel} = 'sample'
        AND ${kpiReports.periodLabel} LIKE ${labelPrefix + "%"}`,
    )
    .returning({ id: kpiReports.id });

  return NextResponse.json({ deleted: deleted.length }, { status: 200 });
};

const isUniqueViolation = (error: unknown) => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
};
