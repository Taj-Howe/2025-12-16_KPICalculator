import { NextResponse } from "next/server";

import { getIntegrationUserKey, unauthorizedIntegrationResponse } from "@/features/integrations/server";
import { listSnapshots } from "@/features/integrations/store";

export const GET = async (request: Request) => {
  const userKey = await getIntegrationUserKey();
  if (userKey == null) {
    return unauthorizedIntegrationResponse();
  }

  const { searchParams } = new URL(request.url);
  const offerKey = searchParams.get("offerKey");
  const period = searchParams.get("period");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const snapshots = listSnapshots(userKey).filter((snapshot) => {
    if (offerKey != null && snapshot.offerKey !== offerKey) {
      return false;
    }
    if (period != null && snapshot.analysisPeriod !== period) {
      return false;
    }
    if (start != null && snapshot.windowStart < start) {
      return false;
    }
    if (end != null && snapshot.windowEnd > end) {
      return false;
    }
    return true;
  });

  return NextResponse.json({ snapshots }, { status: 200 });
};
