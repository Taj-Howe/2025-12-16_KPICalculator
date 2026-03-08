import { NextResponse } from "next/server";

import { getIntegrationUserKey, unauthorizedIntegrationResponse } from "@/features/integrations/server";
import { mapSnapshotToCalculatorInput } from "@/features/integrations/service";
import { getSnapshot } from "@/features/integrations/store";

export const GET = async (
  _: Request,
  context: { params: Promise<{ snapshotId: string }> },
) => {
  const userKey = await getIntegrationUserKey();
  if (userKey == null) {
    return unauthorizedIntegrationResponse();
  }

  const { snapshotId } = await context.params;
  const snapshot = getSnapshot(userKey, snapshotId);
  if (snapshot == null) {
    return NextResponse.json({ error: "Snapshot not found." }, { status: 404 });
  }

  return NextResponse.json(mapSnapshotToCalculatorInput(snapshot), { status: 200 });
};
