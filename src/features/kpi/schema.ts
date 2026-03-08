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
  calculatorMode: z.enum(["unit_economics", "business_metrics"]).optional(),
  revenueInputMode: z.enum(["total_revenue", "direct_arpc"]).optional(),
  revenuePerPeriod: z.number().nonnegative().optional(),
  directArpc: z.number().nonnegative().optional(),
  grossProfitInputMode: z.enum(["margin", "costs"]).optional(),
  grossMargin: z.number().min(0).max(1).optional(),
  deliveryCostPerCustomerPerPeriod: z.number().nonnegative().optional(),
  fixedDeliveryCostPerPeriod: z.number().nonnegative().optional(),
  cacInputMode: z.enum(["derived", "direct"]).optional(),
  marketingSpendPerPeriod: z.number().nonnegative().optional(),
  directCac: z.number().nonnegative().optional(),
  retentionInputMode: z.enum(["counts", "rate"]).optional(),
  newCustomersPerPeriod: z.number().nonnegative(),
  activeCustomersStart: z.number().nonnegative().optional(),
  directChurnRatePerPeriod: z.number().min(0).max(1).optional(),
  churnedCustomersPerPeriod: z.number().nonnegative().optional(),
  retainedCustomersFromStartAtEnd: z.number().nonnegative().optional(),
  softwareConfig: softwareTechConfigSchema.optional(),
});

export const subscriptionOfferInputSchema = subscriptionOfferSchemaBase.superRefine(
  (value, ctx) => {
    const revenueInputMode = value.revenueInputMode ?? "total_revenue";
    const grossProfitInputMode = value.grossProfitInputMode ?? "margin";
    const cacInputMode = value.cacInputMode ?? "derived";
    const retentionInputMode = value.retentionInputMode ?? "counts";
    const activeCustomersStart = value.activeCustomersStart ?? 0;
    const hasRetained = value.retainedCustomersFromStartAtEnd != null;
    const hasChurned = value.churnedCustomersPerPeriod != null;

    if (revenueInputMode === "total_revenue" && value.revenuePerPeriod == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Revenue per period is required when revenue mode is total revenue.",
        path: ["revenuePerPeriod"],
      });
    }

    if (revenueInputMode === "direct_arpc" && value.directArpc == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Direct subscription price / ARPC is required when revenue mode is direct ARPC.",
        path: ["directArpc"],
      });
    }

    if (
      revenueInputMode === "total_revenue" &&
      value.activeCustomersStart == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Active customers at start is required when revenue mode is total revenue.",
        path: ["activeCustomersStart"],
      });
    }

    if (retentionInputMode === "counts" && value.activeCustomersStart == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Active customers at start is required when retention mode is counts.",
        path: ["activeCustomersStart"],
      });
    }

    if (retentionInputMode === "counts" && !hasRetained && !hasChurned) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either churned customers or retained-from-start count.",
        path: ["retainedCustomersFromStartAtEnd"],
      });
    }

    if (
      retentionInputMode === "counts" &&
      hasRetained &&
      (value.retainedCustomersFromStartAtEnd ?? 0) > activeCustomersStart
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Customers still active from the starting cohort cannot exceed the number of starting active customers.",
        path: ["retainedCustomersFromStartAtEnd"],
      });
    }

    if (
      retentionInputMode === "counts" &&
      hasChurned &&
      (value.churnedCustomersPerPeriod ?? 0) > activeCustomersStart
    ) {
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

    if (retentionInputMode === "rate" && value.directChurnRatePerPeriod == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Direct churn rate is required when retention mode is rate.",
        path: ["directChurnRatePerPeriod"],
      });
    }

    if (grossProfitInputMode === "margin" && value.grossMargin == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Gross margin is required when gross profit mode is margin.",
        path: ["grossMargin"],
      });
    }

    if (
      grossProfitInputMode === "costs" &&
      value.deliveryCostPerCustomerPerPeriod == null &&
      value.fixedDeliveryCostPerPeriod == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide delivery cost per customer or fixed delivery cost when gross profit mode is costs.",
        path: ["deliveryCostPerCustomerPerPeriod"],
      });
    }

    if (cacInputMode === "derived" && value.marketingSpendPerPeriod == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Marketing spend is required when CAC mode is derived.",
        path: ["marketingSpendPerPeriod"],
      });
    }

    if (cacInputMode === "direct" && value.directCac == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Direct CAC is required when CAC mode is direct.",
        path: ["directCac"],
      });
    }
  },
);

const softwarePaidPilotInputSchema = z
  .object({
    offerId: z.string().trim().min(1).max(120),
    offerName: z.string().trim().min(1).max(120),
    offerType: z.literal("software_paid_pilot"),
    analysisPeriod: z.enum(periods as [KpiPeriod, ...KpiPeriod[]]),
    softwareConfig: softwareTechConfigSchema,
    newCustomersPerPeriod: z.number().nonnegative(),
    cacInputMode: z.enum(["derived", "direct"]).optional(),
    marketingSpendPerPeriod: z.number().nonnegative().optional(),
    directCac: z.number().nonnegative().optional(),
    pilotFeePerNewCustomer: z.number().nonnegative(),
    pilotDeliveryCostPerNewCustomer: z.number().nonnegative().optional(),
    pilotGrossMargin: z.number().min(0).max(1).optional(),
  })
  .superRefine((value, ctx) => {
    const cacInputMode = value.cacInputMode ?? "derived";
    if (value.softwareConfig.monetizationModel !== "paid_pilot") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Software paid pilot offers must use the paid_pilot monetization model.",
        path: ["softwareConfig", "monetizationModel"],
      });
    }

    if (cacInputMode === "derived" && value.marketingSpendPerPeriod == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Marketing spend is required when CAC mode is derived.",
        path: ["marketingSpendPerPeriod"],
      });
    }

    if (cacInputMode === "direct" && value.directCac == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Direct CAC is required when CAC mode is direct.",
        path: ["directCac"],
      });
    }

    if (
      value.pilotGrossMargin == null &&
      value.pilotDeliveryCostPerNewCustomer == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide either pilot gross margin or pilot delivery cost per new customer.",
        path: ["pilotGrossMargin"],
      });
    }
  });

const softwareTokenPricingInputSchema = z
  .object({
    offerId: z.string().trim().min(1).max(120),
    offerName: z.string().trim().min(1).max(120),
    offerType: z.literal("software_token_pricing"),
    analysisPeriod: z.enum(periods as [KpiPeriod, ...KpiPeriod[]]),
    softwareConfig: softwareTechConfigSchema,
    newCustomersPerPeriod: z.number().nonnegative(),
    cacInputMode: z.enum(["derived", "direct"]).optional(),
    marketingSpendPerPeriod: z.number().nonnegative().optional(),
    directCac: z.number().nonnegative().optional(),
    activeCustomersStart: z.number().nonnegative(),
    retentionInputMode: z.enum(["counts", "rate"]).optional(),
    directChurnRatePerPeriod: z.number().min(0).max(1).optional(),
    churnedCustomersPerPeriod: z.number().nonnegative().optional(),
    retainedCustomersFromStartAtEnd: z.number().nonnegative().optional(),
    usageUnitsPerCustomerPerPeriod: z.number().nonnegative(),
    pricePerUsageUnit: z.number().nonnegative(),
    costPerUsageUnit: z.number().nonnegative(),
    fixedDeliveryCostPerPeriod: z.number().nonnegative().optional(),
  })
  .superRefine((value, ctx) => {
    const cacInputMode = value.cacInputMode ?? "derived";
    const retentionInputMode = value.retentionInputMode ?? "counts";
    const hasRetained = value.retainedCustomersFromStartAtEnd != null;
    const hasChurned = value.churnedCustomersPerPeriod != null;

    if (value.softwareConfig.monetizationModel !== "token_pricing") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Software token pricing offers must use the token_pricing monetization model.",
        path: ["softwareConfig", "monetizationModel"],
      });
    }

    if (cacInputMode === "derived" && value.marketingSpendPerPeriod == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Marketing spend is required when CAC mode is derived.",
        path: ["marketingSpendPerPeriod"],
      });
    }

    if (cacInputMode === "direct" && value.directCac == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Direct CAC is required when CAC mode is direct.",
        path: ["directCac"],
      });
    }

    if (retentionInputMode === "counts" && !hasRetained && !hasChurned) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either churned customers or retained-from-start count.",
        path: ["retainedCustomersFromStartAtEnd"],
      });
    }

    if (
      retentionInputMode === "counts" &&
      hasRetained &&
      (value.retainedCustomersFromStartAtEnd ?? 0) > value.activeCustomersStart
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Customers still active from the starting cohort cannot exceed the number of starting active customers.",
        path: ["retainedCustomersFromStartAtEnd"],
      });
    }

    if (
      retentionInputMode === "counts" &&
      hasChurned &&
      (value.churnedCustomersPerPeriod ?? 0) > value.activeCustomersStart
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Churned customers cannot exceed active customers at start.",
        path: ["churnedCustomersPerPeriod"],
      });
    }

    if (retentionInputMode === "rate" && value.directChurnRatePerPeriod == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Direct churn rate is required when retention mode is rate.",
        path: ["directChurnRatePerPeriod"],
      });
    }
  });

const softwareHybridPlatformUsageInputSchema = z
  .object({
    offerId: z.string().trim().min(1).max(120),
    offerName: z.string().trim().min(1).max(120),
    offerType: z.literal("software_hybrid_platform_usage"),
    analysisPeriod: z.enum(periods as [KpiPeriod, ...KpiPeriod[]]),
    softwareConfig: softwareTechConfigSchema,
    newCustomersPerPeriod: z.number().nonnegative(),
    cacInputMode: z.enum(["derived", "direct"]).optional(),
    marketingSpendPerPeriod: z.number().nonnegative().optional(),
    directCac: z.number().nonnegative().optional(),
    activeCustomersStart: z.number().nonnegative(),
    retentionInputMode: z.enum(["counts", "rate"]).optional(),
    directChurnRatePerPeriod: z.number().min(0).max(1).optional(),
    churnedCustomersPerPeriod: z.number().nonnegative().optional(),
    retainedCustomersFromStartAtEnd: z.number().nonnegative().optional(),
    platformFeePerCustomerPerPeriod: z.number().nonnegative(),
    usageUnitsPerCustomerPerPeriod: z.number().nonnegative(),
    pricePerUsageUnit: z.number().nonnegative(),
    platformDeliveryCostPerCustomerPerPeriod: z.number().nonnegative().optional(),
    costPerUsageUnit: z.number().nonnegative().optional(),
    fixedDeliveryCostPerPeriod: z.number().nonnegative().optional(),
  })
  .superRefine((value, ctx) => {
    const cacInputMode = value.cacInputMode ?? "derived";
    const retentionInputMode = value.retentionInputMode ?? "counts";
    const hasRetained = value.retainedCustomersFromStartAtEnd != null;
    const hasChurned = value.churnedCustomersPerPeriod != null;

    if (value.softwareConfig.monetizationModel !== "subscription_hybrid") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Software hybrid platform + usage offers must use the subscription_hybrid monetization model.",
        path: ["softwareConfig", "monetizationModel"],
      });
    }

    if (cacInputMode === "derived" && value.marketingSpendPerPeriod == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Marketing spend is required when CAC mode is derived.",
        path: ["marketingSpendPerPeriod"],
      });
    }

    if (cacInputMode === "direct" && value.directCac == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Direct CAC is required when CAC mode is direct.",
        path: ["directCac"],
      });
    }

    if (retentionInputMode === "counts" && !hasRetained && !hasChurned) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either churned customers or retained-from-start count.",
        path: ["retainedCustomersFromStartAtEnd"],
      });
    }

    if (
      retentionInputMode === "counts" &&
      hasRetained &&
      (value.retainedCustomersFromStartAtEnd ?? 0) > value.activeCustomersStart
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Customers still active from the starting cohort cannot exceed the number of starting active customers.",
        path: ["retainedCustomersFromStartAtEnd"],
      });
    }

    if (
      retentionInputMode === "counts" &&
      hasChurned &&
      (value.churnedCustomersPerPeriod ?? 0) > value.activeCustomersStart
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Churned customers cannot exceed active customers at start.",
        path: ["churnedCustomersPerPeriod"],
      });
    }

    if (retentionInputMode === "rate" && value.directChurnRatePerPeriod == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Direct churn rate is required when retention mode is rate.",
        path: ["directChurnRatePerPeriod"],
      });
    }
  });

const softwareImplementationPlusSubscriptionInputSchema = z
  .object({
    offerId: z.string().trim().min(1).max(120),
    offerName: z.string().trim().min(1).max(120),
    offerType: z.literal("software_implementation_plus_subscription"),
    analysisPeriod: z.enum(periods as [KpiPeriod, ...KpiPeriod[]]),
    softwareConfig: softwareTechConfigSchema,
    newCustomersPerPeriod: z.number().nonnegative(),
    cacInputMode: z.enum(["derived", "direct"]).optional(),
    marketingSpendPerPeriod: z.number().nonnegative().optional(),
    directCac: z.number().nonnegative().optional(),
    activeCustomersStart: z.number().nonnegative(),
    retentionInputMode: z.enum(["counts", "rate"]).optional(),
    directChurnRatePerPeriod: z.number().min(0).max(1).optional(),
    churnedCustomersPerPeriod: z.number().nonnegative().optional(),
    retainedCustomersFromStartAtEnd: z.number().nonnegative().optional(),
    directArpc: z.number().nonnegative(),
    grossProfitInputMode: z.enum(["margin", "costs"]).optional(),
    grossMargin: z.number().min(0).max(1).optional(),
    deliveryCostPerCustomerPerPeriod: z.number().nonnegative().optional(),
    fixedDeliveryCostPerPeriod: z.number().nonnegative().optional(),
    implementationFeePerNewCustomer: z.number().nonnegative(),
    implementationDeliveryCostPerNewCustomer: z.number().nonnegative().optional(),
    implementationGrossMargin: z.number().min(0).max(1).optional(),
  })
  .superRefine((value, ctx) => {
    const cacInputMode = value.cacInputMode ?? "derived";
    const retentionInputMode = value.retentionInputMode ?? "counts";
    const grossProfitInputMode = value.grossProfitInputMode ?? "margin";
    const hasRetained = value.retainedCustomersFromStartAtEnd != null;
    const hasChurned = value.churnedCustomersPerPeriod != null;

    if (
      value.softwareConfig.monetizationModel !== "implementation_plus_subscription"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Software implementation plus subscription offers must use the implementation_plus_subscription monetization model.",
        path: ["softwareConfig", "monetizationModel"],
      });
    }

    if (cacInputMode === "derived" && value.marketingSpendPerPeriod == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Marketing spend is required when CAC mode is derived.",
        path: ["marketingSpendPerPeriod"],
      });
    }

    if (cacInputMode === "direct" && value.directCac == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Direct CAC is required when CAC mode is direct.",
        path: ["directCac"],
      });
    }

    if (retentionInputMode === "counts" && !hasRetained && !hasChurned) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide either churned customers or retained-from-start count.",
        path: ["retainedCustomersFromStartAtEnd"],
      });
    }

    if (
      retentionInputMode === "counts" &&
      hasRetained &&
      (value.retainedCustomersFromStartAtEnd ?? 0) > value.activeCustomersStart
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Customers still active from the starting cohort cannot exceed the number of starting active customers.",
        path: ["retainedCustomersFromStartAtEnd"],
      });
    }

    if (
      retentionInputMode === "counts" &&
      hasChurned &&
      (value.churnedCustomersPerPeriod ?? 0) > value.activeCustomersStart
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Churned customers cannot exceed active customers at start.",
        path: ["churnedCustomersPerPeriod"],
      });
    }

    if (retentionInputMode === "rate" && value.directChurnRatePerPeriod == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Direct churn rate is required when retention mode is rate.",
        path: ["directChurnRatePerPeriod"],
      });
    }

    if (grossProfitInputMode === "margin" && value.grossMargin == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Gross margin is required when gross profit mode is margin.",
        path: ["grossMargin"],
      });
    }

    if (
      grossProfitInputMode === "costs" &&
      value.deliveryCostPerCustomerPerPeriod == null &&
      value.fixedDeliveryCostPerPeriod == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide delivery cost per customer or fixed delivery cost when gross profit mode is costs.",
        path: ["deliveryCostPerCustomerPerPeriod"],
      });
    }

    if (
      value.implementationGrossMargin == null &&
      value.implementationDeliveryCostPerNewCustomer == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide either implementation gross margin or implementation delivery cost per new customer.",
        path: ["implementationGrossMargin"],
      });
    }
  });

const unsupportedSoftwareOfferInputSchema = z
  .object({
    offerId: z.string().trim().min(1).max(120),
    offerName: z.string().trim().min(1).max(120),
    offerType: z.enum(
      softwareTechOfferTypes.filter(
        (type) =>
          type !== "software_subscription" &&
          type !== "software_paid_pilot" &&
          type !== "software_token_pricing" &&
          type !== "software_hybrid_platform_usage" &&
          type !== "software_implementation_plus_subscription",
      ) as [
        Exclude<
          (typeof softwareTechOfferTypes)[number],
          | "software_subscription"
          | "software_paid_pilot"
          | "software_token_pricing"
          | "software_hybrid_platform_usage"
          | "software_implementation_plus_subscription"
        >,
        ...Exclude<
          (typeof softwareTechOfferTypes)[number],
          | "software_subscription"
          | "software_paid_pilot"
          | "software_token_pricing"
          | "software_hybrid_platform_usage"
          | "software_implementation_plus_subscription"
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
  softwarePaidPilotInputSchema,
  softwareTokenPricingInputSchema,
  softwareHybridPlatformUsageInputSchema,
  softwareImplementationPlusSubscriptionInputSchema,
  unsupportedSoftwareOfferInputSchema,
  unsupportedOfferInputSchema,
]);

export const kpiInputSchema = z.union([legacyKpiInputSchema, offerInputSchema]);

export type KPIInputSchema = z.infer<typeof kpiInputSchema>;
export type LegacyKpiInputSchema = z.infer<typeof legacyKpiInputSchema>;
export type OfferInputSchema = z.infer<typeof offerInputSchema>;
