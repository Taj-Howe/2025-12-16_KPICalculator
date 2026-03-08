import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { integrationSourceSchema } from "@/features/integrations/schema";
import { getIntegrationUserKey, unauthorizedIntegrationResponse } from "@/features/integrations/server";
import { listSources, saveSource } from "@/features/integrations/store";

export const GET = async () => {
  const userKey = await getIntegrationUserKey();
  if (userKey == null) {
    return unauthorizedIntegrationResponse();
  }

  return NextResponse.json({ sources: listSources(userKey) }, { status: 200 });
};

export const POST = async (request: Request) => {
  const userKey = await getIntegrationUserKey();
  if (userKey == null) {
    return unauthorizedIntegrationResponse();
  }

  try {
    const body = await request.json();
    const source = integrationSourceSchema.parse(body);
    return NextResponse.json({ source: saveSource(userKey, source) }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid integration source payload.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Unexpected error saving integration source." },
      { status: 500 },
    );
  }
};
