import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { stripeConnectRequestSchema } from "@/features/integrations/schema";
import { getIntegrationUserKey, unauthorizedIntegrationResponse } from "@/features/integrations/server";
import { verifyStripeApiKey } from "@/features/integrations/stripe";
import { saveSource, saveStripeConfig } from "@/features/integrations/store";

const apiKeyHint = (secretApiKey: string) => secretApiKey.slice(-4);

export const POST = async (request: Request) => {
  const userKey = await getIntegrationUserKey();
  if (userKey == null) {
    return unauthorizedIntegrationResponse();
  }

  try {
    const body = await request.json();
    const parsed = stripeConnectRequestSchema.parse(body);

    await verifyStripeApiKey({ apiKey: parsed.secretApiKey });

    const source = saveSource(userKey, {
      sourceId: parsed.sourceId,
      provider: "stripe",
      connectionLabel: parsed.connectionLabel,
      sourceKind: "payments",
      status: "connected",
    });

    saveStripeConfig(userKey, {
      sourceId: parsed.sourceId,
      secretApiKey: parsed.secretApiKey,
      apiKeyHint: apiKeyHint(parsed.secretApiKey),
    });

    return NextResponse.json(
      {
        source,
        providerConfig: {
          sourceId: parsed.sourceId,
          apiKeyHint: apiKeyHint(parsed.secretApiKey),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid Stripe connection payload.", issues: error.issues },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected Stripe connect error." },
      { status: 500 },
    );
  }
};
