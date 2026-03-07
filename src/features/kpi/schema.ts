import { z } from "zod";
import type { BusinessModel, KpiPeriod } from "./types";

const periods: readonly KpiPeriod[] = ["monthly", "quarterly", "yearly"];
const businessModels: readonly BusinessModel[] = [
  "subscription",
  "transactional",
  "hybrid",
];

const offerTypes = [
  "subscription",
  "one_time",
  "installment",
  "usage_based",
  "service_retainer",
] as const;

const legacyBaseSchema = z.object({
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

export const legacyKpiInputSchema = legacyBaseSchema.superRefine((value, ctx) => {
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

  if (
    (value.businessModel === "transactional" || value.businessModel === "hybrid") &&
    value.activeCustomersEnd == null
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Active customers at end is required for transactional and hybrid models.",
      path: ["activeCustomersEnd"],
    });
  }
});

const subscriptionOfferSchemaBase = z.object({
  offerId: z.string().trim().min(1).max(120),
  offerName: z.string().trim().min(1).max(120),
  offerType: z.literal("subscription"),
  analysisPeriod: z.enum(periods as [KpiPeriod, ...KpiPeriod[]]),
  revenuePerPeriod: z.number().nonnegative(),
  grossMargin: z.number().min(0).max(1),
  marketingSpendPerPeriod: z.number().nonnegative(),
  newCustomersPerPeriod: z.number().nonnegative(),
  activeCustomersStart: z.number().nonnegative(),
  churnedCustomersPerPeriod: z.number().nonnegative().optional(),
  retainedCustomersFromStartAtEnd: z.number().nonnegative().optional(),
});

export const subscriptionOfferInputSchema = subscriptionOfferSchemaBase.superRefine(
  (value, ctx) => {
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
  },
);

const unsupportedOfferInputSchema = z
  .object({
    offerId: z.string().trim().min(1).max(120),
    offerName: z.string().trim().min(1).max(120),
    offerType: z.enum(
      offerTypes.filter((type) => type !== "subscription") as [
        Exclude<(typeof offerTypes)[number], "subscription">,
        ...Exclude<(typeof offerTypes)[number], "subscription">[],
      ],
    ),
    analysisPeriod: z.enum(periods as [KpiPeriod, ...KpiPeriod[]]),
  })
  .superRefine((value, ctx) => {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["offerType"],
      message: `Offer type '${value.offerType}' is not supported yet.`,
    });
  });

export const offerInputSchema = z.union([
  subscriptionOfferInputSchema,
  unsupportedOfferInputSchema,
]);

export const kpiInputSchema = z.union([legacyKpiInputSchema, offerInputSchema]);

export type KPIInputSchema = z.infer<typeof kpiInputSchema>;
export type LegacyKpiInputSchema = z.infer<typeof legacyKpiInputSchema>;
export type OfferInputSchema = z.infer<typeof offerInputSchema>;
