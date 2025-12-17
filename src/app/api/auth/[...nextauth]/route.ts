import { NextResponse } from "next/server";

export const GET = async () => {
  return NextResponse.json({ status: "auth handler not implemented" });
};

export const POST = GET;
