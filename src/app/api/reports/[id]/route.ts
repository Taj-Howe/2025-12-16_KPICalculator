import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";

import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { kpiReports, users } from "@/db/schema";

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

export const DELETE = async (
  _request: Request,
  context: { params: Promise<{ id: string }> },
) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const userId = await resolveUserId(session.user?.email ?? null);
  if (!userId) {
    return NextResponse.json({ error: "Unable to resolve user." }, { status: 401 });
  }

  const params = await context.params;
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid report id." }, { status: 400 });
  }

  const deleted = await db
    .delete(kpiReports)
    .where(and(eq(kpiReports.id, id), eq(kpiReports.userId, userId)))
    .returning({ id: kpiReports.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id }, { status: 200 });
};
