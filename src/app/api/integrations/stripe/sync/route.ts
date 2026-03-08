import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { stripeSyncRequestSchema } from "@/features/integrations/schema";
import { getIntegrationUserKey, unauthorizedIntegrationResponse } from "@/features/integrations/server";
import { runIntegrationSync } from "@/features/integrations/service";
import { pullStripeNormalizedPayload } from "@/features/integrations/stripe";
import {
  getStripeConfig,
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
    const parsed = stripeSyncRequestSchema.parse(body);
    const sources = listSources(userKey);
    const source = sources.find(
      (candidate) =>
        candidate.sourceId === parsed.sourceId && candidate.provider === "stripe",
    );
    if (source == null) {
      return NextResponse.json({ error: "Stripe source not found." }, { status: 404 });
    }

    const sourceConfig = getStripeConfig(userKey, parsed.sourceId);
    if (sourceConfig == null) {
      return NextResponse.json(
        { error: "Stripe source is missing API credentials." },
        { status: 400 },
      );
    }

    const offerMappings = listOfferMappings(userKey).filter(
      (mapping) => mapping.sourceId === parsed.sourceId,
    );
    if (offerMappings.length === 0) {
      return NextResponse.json(
        { error: "At least one Stripe offer mapping is required before sync." },
        { status: 400 },
      );
    }

    const normalizedPayload = await pullStripeNormalizedPayload({
      sourceConfig,
      window: parsed.window,
      offerMappings,
    });

    const result = saveSyncResult(
      userKey,
      runIntegrationSync({
        sources: [source],
        offerMappings,
        accountMappings: listAccountMappings(userKey).filter(
          (mapping) => mapping.sourceId === parsed.sourceId,
        ),
        payload: normalizedPayload,
      }),
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid Stripe sync payload.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected Stripe sync error." },
      { status: 500 },
    );
  }
};
