import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";

import { authOptions } from "@/lib/auth";
import { kpiInputSchema } from "@/features/kpi/schema";
import type { KPIResult } from "@/features/kpi/types";
import { db } from "@/db";
import { kpiReports, users } from "@/db/schema";

const numberOrNull = z.number().nullable();

const resultsSchema: z.ZodType<KPIResult> = z.object({
  cac: numberOrNull,
  arpc: numberOrNull,
  churnRate: numberOrNull,
  ltv: numberOrNull,
  ltgpPerCustomer: numberOrNull,
  ltgpToCacRatio: numberOrNull,
  growthAssessment: numberOrNull,
  hypotheticalMaxRevenuePerYear: numberOrNull,
  hypotheticalMaxProfitPerYear: numberOrNull,
  car: numberOrNull,
});

const saveReportSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  inputs: kpiInputSchema,
  results: resultsSchema,
  warnings: z.array(z.string()),
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

  const [report] = await db
    .insert(kpiReports)
    .values({
      userId,
      title: data.title ?? null,
      period: data.inputs.period,
      businessModel: data.inputs.businessModel,
      inputJson: data.inputs,
      resultJson: data.results,
      warningsJson: data.warnings,
    })
    .returning({
      id: kpiReports.id,
      title: kpiReports.title,
      createdAt: kpiReports.createdAt,
      period: kpiReports.period,
      businessModel: kpiReports.businessModel,
    });

  return NextResponse.json({ report }, { status: 201 });
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

  return NextResponse.json({ reports }, { status: 200 });
};
