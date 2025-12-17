import { NextResponse } from "next/server";

export const POST = async () => {
  return NextResponse.json({
    inputs: null,
    results: null,
    warnings: [],
  });
};
