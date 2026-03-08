import { NextResponse } from "next/server";

import { getIntegrationUserKey, unauthorizedIntegrationResponse } from "@/features/integrations/server";
import { createSampleStripeSeed, runSampleStripeImports } from "@/features/integrations/sample-stripe";
import {
  clearSourceData,
  saveSource,
  saveOfferMappings,
  saveSyncResult,
} from "@/features/integrations/store";

export const POST = async () => {
  const userKey = await getIntegrationUserKey();
  if (userKey == null) {
    return unauthorizedIntegrationResponse();
  }

  try {
    const year = new Date().getFullYear();
    const seed = createSampleStripeSeed(year);

    clearSourceData(userKey, seed.source.sourceId);
    saveSource(userKey, seed.source);
    saveOfferMappings(userKey, seed.offerMappings);

    const results = runSampleStripeImports(year).map((result) =>
      saveSyncResult(userKey, result),
    );

    return NextResponse.json(
      {
        source: seed.source,
        createdYear: year,
        summary: {
          syncCount: results.length,
          snapshotCount: results.reduce(
            (total, result) => total + result.snapshots.length,
            0,
          ),
          offerCount: seed.offerMappings.length,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected sample Stripe import error.",
      },
      { status: 500 },
    );
  }
};
