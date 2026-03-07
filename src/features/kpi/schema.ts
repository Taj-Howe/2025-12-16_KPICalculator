import { z } from "zod";
import type { BusinessModel, KpiPeriod } from "./types";
import {
  softwareSubscriptionModels,
  softwareTechMonetizationModels,
  softwareTechOfferTypes,
} from "./software-tech";

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

const softwareRevenueComponentSchema = z.discriminatedUnion("componentType", [
  z.object({
    componentType: z.literal("platform_subscription"),
    label: z.string().trim().min(1).max(120),
    pricingMetric: z
      .enum(["workspace", "account", "organization"])
      .optional(),
  }),
  z.object({
    componentType: z.literal("seat_subscription"),
    label: z.string().trim().min(1).max(120),
    pricingMetric: z
      .enum(["seat", "active_user", "licensed_user"])
      .optional(),
  }),
  z.object({
    componentType: z.literal("usage_metered"),
    label: z.string().trim().min(1).max(120),
    unitName: z.string().trim().min(1).max(60),
  }),
  z.object({
    componentType: z.literal("token_usage"),
    label: z.string().trim().min(1).max(120),
    tokenUnit: z.enum(["1k_tokens", "1m_tokens"]),
  }),
  z.object({
    componentType: z.literal("pilot_fee"),
    label: z.string().trim().min(1).max(120),
  }),
  z.object({
    componentType: z.literal("implementation_fee"),
    label: z.string().trim().min(1).max(120),
  }),
  z.object({
    componentType: z.literal("transaction_fee"),
    label: z.string().trim().min(1).max(120),
    pricingMetric: z.enum(["gsv", "tpv", "order_volume"]).optional(),
  }),
]);

const softwareTechConfigSchema = z.object({
  industryPreset: z.literal("software_tech"),
  monetizationModel: z.enum(softwareTechMonetizationModels),
  revenueComponents: z.array(softwareRevenueComponentSchema).min(1),
  goToMarketMotion: z
    .enum([
      "self_serve",
      "product_led",
      "sales_led",
      "enterprise",
      "channel_partner",
    ])
    .optional(),
  notes: z.string().trim().max(500).optional(),
});

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
  offerType: z.enum(["subscription", "software_subscription"]),
  analysisPeriod: z.enum(periods as [KpiPeriod, ...KpiPeriod[]]),
  revenuePerPeriod: z.number().nonnegative(),
  grossMargin: z.number().min(0).max(1),
  marketingSpendPerPeriod: z.number().nonnegative(),
  newCustomersPerPeriod: z.number().nonnegative(),
  activeCustomersStart: z.number().nonnegative(),
  churnedCustomersPerPeriod: z.number().nonnegative().optional(),
  retainedCustomersFromStartAtEnd: z.number().nonnegative().optional(),
  softwareConfig: softwareTechConfigSchema.optional(),
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

    if (value.offerType === "software_subscription") {
      if (value.softwareConfig == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Software subscription offers require software/tech monetization metadata.",
          path: ["softwareConfig"],
        });
        return;
      }

      if (
        !softwareSubscriptionModels.includes(
          value.softwareConfig.monetizationModel as
            (typeof softwareSubscriptionModels)[number],
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Software subscription offers must use a subscription monetization model.",
          path: ["softwareConfig", "monetizationModel"],
        });
      }
    }
  },
);

const unsupportedSoftwareOfferInputSchema = z
  .object({
    offerId: z.string().trim().min(1).max(120),
    offerName: z.string().trim().min(1).max(120),
    offerType: z.enum(
      softwareTechOfferTypes.filter(
        (type) => type !== "software_subscription",
      ) as [
        Exclude<(typeof softwareTechOfferTypes)[number], "software_subscription">,
        ...Exclude<
          (typeof softwareTechOfferTypes)[number],
          "software_subscription"
        >[],
      ],
    ),
    analysisPeriod: z.enum(periods as [KpiPeriod, ...KpiPeriod[]]),
    softwareConfig: softwareTechConfigSchema,
  })
  .superRefine((value, ctx) => {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["offerType"],
      message: `Software/tech offer type '${value.offerType}' is defined but not implemented yet.`,
    });
  });

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
  unsupportedSoftwareOfferInputSchema,
  unsupportedOfferInputSchema,
]);

export const kpiInputSchema = z.union([legacyKpiInputSchema, offerInputSchema]);

export type KPIInputSchema = z.infer<typeof kpiInputSchema>;
export type LegacyKpiInputSchema = z.infer<typeof legacyKpiInputSchema>;
export type OfferInputSchema = z.infer<typeof offerInputSchema>;
