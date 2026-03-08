import { NextResponse } from "next/server";

import { getIntegrationUserKey, unauthorizedIntegrationResponse } from "@/features/integrations/server";
import { getSyncResult } from "@/features/integrations/store";

export const GET = async (
  _: Request,
  context: { params: Promise<{ syncId: string }> },
) => {
  const userKey = await getIntegrationUserKey();
  if (userKey == null) {
    return unauthorizedIntegrationResponse();
  }

  const { syncId } = await context.params;
  const result = getSyncResult(userKey, syncId);
  if (result == null) {
    return NextResponse.json({ error: "Sync result not found." }, { status: 404 });
  }

  return NextResponse.json(result, { status: 200 });
};
