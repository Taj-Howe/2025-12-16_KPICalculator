import { z } from "zod";

export const integrationSourceSchema = z.object({
  sourceId: z.string().trim().min(1).max(120),
  provider: z.enum(["stripe", "quickbooks", "xero", "manual_csv"]),
  connectionLabel: z.string().trim().min(1).max(120),
  sourceKind: z.enum(["payments", "accounting"]),
  status: z.enum(["connected", "syncing", "error", "disconnected"]),
});

export const stripeSourceConfigSchema = z.object({
  sourceId: z.string().trim().min(1).max(120),
  secretApiKey: z.string().trim().min(1).startsWith("sk_"),
  apiKeyHint: z.string().trim().min(4).max(16),
});

export const importWindowSchema = z
  .object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    analysisPeriod: z.enum(["monthly", "quarterly", "yearly"]),
  })
  .superRefine((value, ctx) => {
    if (new Date(value.startAt).getTime() >= new Date(value.endAt).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "Import window endAt must be after startAt.",
      });
    }
  });

export const normalizedCustomerSchema = z.object({
  customerKey: z.string().trim().min(1).max(120),
  externalCustomerId: z.string().trim().min(1).max(120),
  sourceId: z.string().trim().min(1).max(120),
  firstPaidAt: z.string().datetime().nullable(),
  currentStatus: z.enum(["active", "canceled", "past_due", "inactive", "unknown"]),
});

export const normalizedOfferMappingSchema = z.object({
  mappingId: z.string().trim().min(1).max(120),
  offerKey: z.string().trim().min(1).max(120),
  offerName: z.string().trim().min(1).max(120),
  offerType: z.enum([
    "software_subscription",
    "software_paid_pilot",
    "software_token_pricing",
    "software_hybrid_platform_usage",
    "software_implementation_plus_subscription",
  ]),
  sourceId: z.string().trim().min(1).max(120),
  externalProductKeys: z.array(z.string().trim().min(1).max(120)),
  externalPriceKeys: z.array(z.string().trim().min(1).max(120)),
  revenueClassification: z.enum([
    "subscription_base",
    "usage",
    "pilot",
    "implementation",
    "hybrid_base",
    "hybrid_usage",
  ]),
});

export const accountMappingSchema = z.object({
  accountMappingId: z.string().trim().min(1).max(120),
  sourceId: z.string().trim().min(1).max(120),
  externalAccountKey: z.string().trim().min(1).max(120),
  mappedRole: z.enum([
    "cac_eligible",
    "delivery_cost",
    "implementation_cost",
    "overhead",
    "excluded",
  ]),
  expenseCategory: z.enum([
    "marketing",
    "sales",
    "processor_fees",
    "cogs",
    "hosting",
    "ai_inference",
    "support",
    "implementation_labor",
    "overhead",
    "unknown",
  ]),
  offerKey: z.string().trim().min(1).max(120).nullable(),
});

export const normalizedRevenueEventSchema = z.object({
  revenueEventId: z.string().trim().min(1).max(120),
  sourceId: z.string().trim().min(1).max(120),
  customerKey: z.string().trim().min(1).max(120).nullable(),
  offerKey: z.string().trim().min(1).max(120).nullable(),
  externalProductKey: z.string().trim().min(1).max(120).nullable(),
  externalPriceKey: z.string().trim().min(1).max(120).nullable(),
  occurredAt: z.string().datetime(),
  servicePeriodStart: z.string().datetime().nullable(),
  servicePeriodEnd: z.string().datetime().nullable(),
  category: z.enum([
    "subscription",
    "usage",
    "pilot",
    "implementation",
    "discount",
    "tax",
    "processor_fee_adjustment",
  ]),
  grossAmount: z.number(),
  refundedAmount: z.number().nonnegative(),
  netAmount: z.number(),
  currency: z.string().trim().min(1).max(16),
  quantity: z.number().nullable(),
  unitAmount: z.number().nullable(),
});

export const normalizedRefundEventSchema = z.object({
  refundEventId: z.string().trim().min(1).max(120),
  sourceId: z.string().trim().min(1).max(120),
  customerKey: z.string().trim().min(1).max(120).nullable(),
  offerKey: z.string().trim().min(1).max(120).nullable(),
  occurredAt: z.string().datetime(),
  amount: z.number().nonnegative(),
  currency: z.string().trim().min(1).max(16),
  originalRevenueEventId: z.string().trim().min(1).max(120).nullable(),
});

export const normalizedExpenseEventSchema = z.object({
  expenseEventId: z.string().trim().min(1).max(120),
  sourceId: z.string().trim().min(1).max(120),
  occurredAt: z.string().datetime(),
  amount: z.number().nonnegative(),
  currency: z.string().trim().min(1).max(16),
  category: z.enum([
    "marketing",
    "sales",
    "processor_fees",
    "cogs",
    "hosting",
    "ai_inference",
    "support",
    "implementation_labor",
    "overhead",
    "unknown",
  ]),
  mappedRole: z
    .enum([
      "cac_eligible",
      "delivery_cost",
      "implementation_cost",
      "overhead",
      "excluded",
    ])
    .nullable(),
  offerKey: z.string().trim().min(1).max(120).nullable(),
  externalAccountKey: z.string().trim().min(1).max(120).nullable(),
});

export const normalizedSubscriptionStateSchema = z.object({
  subscriptionKey: z.string().trim().min(1).max(120),
  sourceId: z.string().trim().min(1).max(120),
  customerKey: z.string().trim().min(1).max(120),
  offerKey: z.string().trim().min(1).max(120).nullable(),
  externalProductKey: z.string().trim().min(1).max(120).nullable(),
  externalPriceKey: z.string().trim().min(1).max(120).nullable(),
  status: z.enum([
    "trialing",
    "active",
    "past_due",
    "paused",
    "canceled",
    "incomplete",
    "unknown",
  ]),
  startedAt: z.string().datetime().nullable(),
  canceledAt: z.string().datetime().nullable(),
  currentPeriodStart: z.string().datetime().nullable(),
  currentPeriodEnd: z.string().datetime().nullable(),
  billingInterval: z.enum(["monthly", "quarterly", "yearly", "custom", "unknown"]),
});

export const integrationSyncPayloadSchema = z.object({
  window: importWindowSchema,
  customers: z.array(normalizedCustomerSchema).optional(),
  revenueEvents: z.array(normalizedRevenueEventSchema).optional(),
  refundEvents: z.array(normalizedRefundEventSchema).optional(),
  expenseEvents: z.array(normalizedExpenseEventSchema).optional(),
  subscriptionStates: z.array(normalizedSubscriptionStateSchema).optional(),
});

export const stripeConnectRequestSchema = z.object({
  sourceId: z.string().trim().min(1).max(120),
  connectionLabel: z.string().trim().min(1).max(120),
  secretApiKey: z.string().trim().min(1).startsWith("sk_"),
});

export const stripeSyncRequestSchema = z.object({
  sourceId: z.string().trim().min(1).max(120),
  window: importWindowSchema,
});
