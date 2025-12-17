import { z } from "zod";
import type { BusinessModel, KpiPeriod } from "./types";

const periods: readonly KpiPeriod[] = ["monthly", "quarterly", "yearly"];
const businessModels: readonly BusinessModel[] = [
  "subscription",
  "transactional",
  "hybrid",
];

const baseSchema = z.object({
  period: z.enum(periods as [KpiPeriod, ...KpiPeriod[]]),
  businessModel: z.enum(businessModels as [BusinessModel, ...BusinessModel[]]),
  revenuePerPeriod: z.number().nonnegative(),
  grossMargin: z.number().min(0).max(1),
  marketingSpendPerPeriod: z.number().nonnegative(),
  newCustomersPerPeriod: z.number().nonnegative(),
  activeCustomersStart: z.number().nonnegative(),
  activeCustomersEnd: z.number().nonnegative(),
  churnedCustomersPerPeriod: z.number().nonnegative().optional(),
  retentionRatePerPeriod: z.number().min(0).max(1).optional(),
});

export const kpiInputSchema = baseSchema.superRefine((value, ctx) => {
  if (value.businessModel === "subscription" && value.churnedCustomersPerPeriod == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Subscription model requires churnedCustomersPerPeriod.",
      path: ["churnedCustomersPerPeriod"],
    });
  }

  if (value.businessModel === "transactional" && value.retentionRatePerPeriod == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Transactional model requires retentionRatePerPeriod.",
      path: ["retentionRatePerPeriod"],
    });
  }
});

export type KPIInputSchema = z.infer<typeof kpiInputSchema>;
