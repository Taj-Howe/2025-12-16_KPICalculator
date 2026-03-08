import type {
  SoftwareHybridPlatformUsageInput,
  SoftwareImplementationPlusSubscriptionInput,
  SoftwarePaidPilotInput,
  SoftwareTokenPricingInput,
  SubscriptionOfferInput,
} from "@/features/kpi/types";

export type IntegrationProvider = "stripe" | "quickbooks" | "xero" | "manual_csv";
export type IntegrationSourceKind = "payments" | "accounting";
export type IntegrationStatus =
  | "connected"
  | "syncing"
  | "error"
  | "disconnected";

export type IntegrationSource = {
  sourceId: string;
  provider: IntegrationProvider;
  connectionLabel: string;
  sourceKind: IntegrationSourceKind;
  status: IntegrationStatus;
};

export type StripeSourceConfig = {
  sourceId: string;
  secretApiKey: string;
  apiKeyHint: string;
};

export type ImportWindow = {
  startAt: string;
  endAt: string;
  analysisPeriod: "monthly" | "quarterly" | "yearly";
};

export type NormalizedCustomer = {
  customerKey: string;
  externalCustomerId: string;
  sourceId: string;
  firstPaidAt: string | null;
  currentStatus: "active" | "canceled" | "past_due" | "inactive" | "unknown";
};

export type ImportedOfferType =
  | "software_subscription"
  | "software_paid_pilot"
  | "software_token_pricing"
  | "software_hybrid_platform_usage"
  | "software_implementation_plus_subscription";

export type RevenueClassification =
  | "subscription_base"
  | "usage"
  | "pilot"
  | "implementation"
  | "hybrid_base"
  | "hybrid_usage";

export type NormalizedOfferMapping = {
  mappingId: string;
  offerKey: string;
  offerName: string;
  offerType: ImportedOfferType;
  sourceId: string;
  externalProductKeys: string[];
  externalPriceKeys: string[];
  revenueClassification: RevenueClassification;
};

export type AccountMappedRole =
  | "cac_eligible"
  | "delivery_cost"
  | "implementation_cost"
  | "overhead"
  | "excluded";

export type ExpenseCategory =
  | "marketing"
  | "sales"
  | "processor_fees"
  | "cogs"
  | "hosting"
  | "ai_inference"
  | "support"
  | "implementation_labor"
  | "overhead"
  | "unknown";

export type AccountMapping = {
  accountMappingId: string;
  sourceId: string;
  externalAccountKey: string;
  mappedRole: AccountMappedRole;
  expenseCategory: ExpenseCategory;
  offerKey: string | null;
};

export type RevenueCategory =
  | "subscription"
  | "usage"
  | "pilot"
  | "implementation"
  | "discount"
  | "tax"
  | "processor_fee_adjustment";

export type NormalizedRevenueEvent = {
  revenueEventId: string;
  sourceId: string;
  customerKey: string | null;
  offerKey: string | null;
  externalProductKey: string | null;
  externalPriceKey: string | null;
  occurredAt: string;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
  category: RevenueCategory;
  grossAmount: number;
  refundedAmount: number;
  netAmount: number;
  currency: string;
  quantity: number | null;
  unitAmount: number | null;
};

export type NormalizedRefundEvent = {
  refundEventId: string;
  sourceId: string;
  customerKey: string | null;
  offerKey: string | null;
  occurredAt: string;
  amount: number;
  currency: string;
  originalRevenueEventId: string | null;
};

export type NormalizedExpenseEvent = {
  expenseEventId: string;
  sourceId: string;
  occurredAt: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  mappedRole: AccountMappedRole | null;
  offerKey: string | null;
  externalAccountKey: string | null;
};

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "canceled"
  | "incomplete"
  | "unknown";

export type NormalizedSubscriptionState = {
  subscriptionKey: string;
  sourceId: string;
  customerKey: string;
  offerKey: string | null;
  externalProductKey: string | null;
  externalPriceKey: string | null;
  status: SubscriptionStatus;
  startedAt: string | null;
  canceledAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  billingInterval: "monthly" | "quarterly" | "yearly" | "custom" | "unknown";
};

export type SnapshotDataCompleteness = "high" | "medium" | "low";

export type NormalizedOfferPeriodSnapshot = {
  snapshotId: string;
  offerKey: string;
  offerName: string;
  offerType: ImportedOfferType;
  analysisPeriod: "monthly" | "quarterly" | "yearly";
  windowStart: string;
  windowEnd: string;
  revenue: {
    grossReceipts: number | null;
    refunds: number | null;
    netReceipts: number | null;
    recognizedRevenueApprox: number | null;
    subscriptionRevenue: number | null;
    usageRevenue: number | null;
    pilotRevenue: number | null;
    implementationRevenue: number | null;
  };
  customers: {
    activeCustomersStart: number | null;
    activeCustomersEnd: number | null;
    newCustomers: number | null;
    retainedFromStart: number | null;
    churnedFromStart: number | null;
    directChurnRate: number | null;
  };
  acquisition: {
    marketingSpend: number | null;
    salesSpend: number | null;
    cacEligibleSpend: number | null;
    directCac: number | null;
  };
  delivery: {
    cogs: number | null;
    processorFees: number | null;
    hostingCost: number | null;
    aiInferenceCost: number | null;
    supportCost: number | null;
    implementationCost: number | null;
    observableGrossMargin: number | null;
  };
  usage: {
    totalUsageUnits: number | null;
    usageUnitsPerCustomer: number | null;
    pricePerUsageUnit: number | null;
    costPerUsageUnit: number | null;
  };
  quality: {
    dataCompleteness: SnapshotDataCompleteness;
    missingFields: string[];
    assumptions: string[];
    warnings: string[];
  };
};

export type ImportedSnapshotToCalculatorResult = {
  offerInput:
    | SubscriptionOfferInput
    | SoftwarePaidPilotInput
    | SoftwareTokenPricingInput
    | SoftwareHybridPlatformUsageInput
    | SoftwareImplementationPlusSubscriptionInput
    | null;
  unmappedFields: string[];
  assumptionsApplied: string[];
  warnings: string[];
};

export type IntegrationSyncPayload = {
  window: ImportWindow;
  customers?: NormalizedCustomer[];
  revenueEvents?: NormalizedRevenueEvent[];
  refundEvents?: NormalizedRefundEvent[];
  expenseEvents?: NormalizedExpenseEvent[];
  subscriptionStates?: NormalizedSubscriptionState[];
};

export type IntegrationSyncResult = {
  syncId: string;
  createdAt: string;
  window: ImportWindow;
  snapshots: NormalizedOfferPeriodSnapshot[];
  summary: {
    sourceCount: number;
    offerCount: number;
    revenueEventCount: number;
    refundEventCount: number;
    expenseEventCount: number;
    subscriptionStateCount: number;
    snapshotCount: number;
  };
};

export type StripeConnectRequest = {
  sourceId: string;
  connectionLabel: string;
  secretApiKey: string;
};

export type StripeSyncRequest = {
  sourceId: string;
  window: ImportWindow;
};
