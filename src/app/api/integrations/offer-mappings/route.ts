import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { normalizedOfferMappingSchema } from "@/features/integrations/schema";
import { getIntegrationUserKey, unauthorizedIntegrationResponse } from "@/features/integrations/server";
import { listOfferMappings, saveOfferMappings } from "@/features/integrations/store";

const offerMappingsSchema = z.array(normalizedOfferMappingSchema).min(1);

export const GET = async () => {
  const userKey = await getIntegrationUserKey();
  if (userKey == null) {
    return unauthorizedIntegrationResponse();
  }

  return NextResponse.json({ offerMappings: listOfferMappings(userKey) }, { status: 200 });
};

export const POST = async (request: Request) => {
  const userKey = await getIntegrationUserKey();
  if (userKey == null) {
    return unauthorizedIntegrationResponse();
  }

  try {
    const body = await request.json();
    const offerMappings = offerMappingsSchema.parse(body);
    return NextResponse.json(
      { offerMappings: saveOfferMappings(userKey, offerMappings) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid offer mapping payload.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Unexpected error saving offer mappings." },
      { status: 500 },
    );
  }
};
