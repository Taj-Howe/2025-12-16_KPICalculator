import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";

export const getIntegrationUserKey = async () => {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (email == null) {
    return null;
  }
  return email;
};

export const unauthorizedIntegrationResponse = () =>
  NextResponse.json({ error: "Unauthorized." }, { status: 401 });
