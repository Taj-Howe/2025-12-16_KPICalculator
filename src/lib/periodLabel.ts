import { z } from "zod";
import type { KpiPeriod } from "@/features/kpi/types";

const monthlyRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
const quarterlyRegex = /^\d{4}-Q[1-4]$/;
const yearlyRegex = /^\d{4}$/;

const monthMessage = "For monthly period, periodLabel must be YYYY-MM (e.g., 2026-01).";
const quarterMessage = "For quarterly period, periodLabel must be YYYY-Q1..Q4 (e.g., 2026-Q1).";
const yearMessage = "For yearly period, periodLabel must be YYYY (e.g., 2026).";

export const periodLabelSchema = (period: KpiPeriod) => {
  switch (period) {
    case "monthly":
      return z
        .string()
        .regex(monthlyRegex, monthMessage);
    case "quarterly":
      return z
        .string()
        .regex(quarterlyRegex, quarterMessage);
    case "yearly":
    default:
      return z
        .string()
        .regex(yearlyRegex, yearMessage);
  }
};

export const validatePeriodLabel = (period: KpiPeriod, label: string) => {
  return periodLabelSchema(period).parse(label);
};
