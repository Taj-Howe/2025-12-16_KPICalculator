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
  activeCustomersEnd: z.number().nonnegative().optional(),
  churnedCustomersPerPeriod: z.number().nonnegative().optional(),
  retainedCustomersFromStartAtEnd: z.number().nonnegative().optional(),
  retentionRatePerPeriod: z.number().min(0).max(1).optional(),
});

export const kpiInputSchema = baseSchema.superRefine((value, ctx) => {
  if (value.businessModel === "subscription") {
    const hasRetained = value.retainedCustomersFromStartAtEnd != null;
    const hasChurned = value.churnedCustomersPerPeriod != null;
    if (!hasRetained && !hasChurned) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either churned customers or retained-from-start count.",
        path: ["retainedCustomersFromStartAtEnd"],
      });
    }

    if (hasRetained && (value.retainedCustomersFromStartAtEnd ?? 0) > value.activeCustomersStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Customers still active from the starting cohort cannot exceed the number of starting active customers.",
        path: ["retainedCustomersFromStartAtEnd"],
      });
    }

    if (hasChurned && (value.churnedCustomersPerPeriod ?? 0) > value.activeCustomersStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Churned customers cannot exceed active customers at start.",
        path: ["churnedCustomersPerPeriod"],
      });
    }
  }

  if (value.businessModel === "transactional" && value.retentionRatePerPeriod == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Transactional model requires retention rate per period.",
      path: ["retentionRatePerPeriod"],
    });
  }
});

export type KPIInputSchema = z.infer<typeof kpiInputSchema>;
