import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { integrationSyncPayloadSchema } from "@/features/integrations/schema";
import { getIntegrationUserKey, unauthorizedIntegrationResponse } from "@/features/integrations/server";
import { runIntegrationSync } from "@/features/integrations/service";
import {
  listAccountMappings,
  listOfferMappings,
  listSources,
  saveSyncResult,
} from "@/features/integrations/store";

export const POST = async (request: Request) => {
  const userKey = await getIntegrationUserKey();
  if (userKey == null) {
    return unauthorizedIntegrationResponse();
  }

  try {
    const body = await request.json();
    const payload = integrationSyncPayloadSchema.parse(body);
    const sources = listSources(userKey);
    const offerMappings = listOfferMappings(userKey);
    const accountMappings = listAccountMappings(userKey);

    if (sources.length === 0) {
      return NextResponse.json(
        { error: "At least one integration source is required before sync." },
        { status: 400 },
      );
    }

    if (offerMappings.length === 0) {
      return NextResponse.json(
        { error: "At least one offer mapping is required before sync." },
        { status: 400 },
      );
    }

    const result = saveSyncResult(
      userKey,
      runIntegrationSync({
        sources,
        offerMappings,
        accountMappings,
        payload,
      }),
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid integration sync payload.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Unexpected error running integration sync." },
      { status: 500 },
    );
  }
};
