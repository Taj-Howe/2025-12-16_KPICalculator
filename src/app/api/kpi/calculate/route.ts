import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { evaluateKpis } from "@/features/kpi/service";

export const POST = async (request: Request) => {
  try {
    const body = await request.json();
    const evaluation = evaluateKpis(body);
    return NextResponse.json(evaluation, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid KPI payload.",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Unexpected error calculating KPIs.",
      },
      { status: 500 },
    );
  }
};
