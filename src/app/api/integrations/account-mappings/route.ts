import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { accountMappingSchema } from "@/features/integrations/schema";
import { getIntegrationUserKey, unauthorizedIntegrationResponse } from "@/features/integrations/server";
import { listAccountMappings, saveAccountMappings } from "@/features/integrations/store";

const accountMappingsSchema = z.array(accountMappingSchema).min(1);

export const GET = async () => {
  const userKey = await getIntegrationUserKey();
  if (userKey == null) {
    return unauthorizedIntegrationResponse();
  }

  return NextResponse.json({ accountMappings: listAccountMappings(userKey) }, { status: 200 });
};

export const POST = async (request: Request) => {
  const userKey = await getIntegrationUserKey();
  if (userKey == null) {
    return unauthorizedIntegrationResponse();
  }

  try {
    const body = await request.json();
    const accountMappings = accountMappingsSchema.parse(body);
    return NextResponse.json(
      { accountMappings: saveAccountMappings(userKey, accountMappings) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid account mapping payload.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Unexpected error saving account mappings." },
      { status: 500 },
    );
  }
};
