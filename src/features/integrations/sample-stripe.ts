import { runIntegrationSync } from "./service";
import type {
  IntegrationSource,
  IntegrationSyncPayload,
  IntegrationSyncResult,
  NormalizedExpenseEvent,
  NormalizedOfferMapping,
  NormalizedRefundEvent,
  NormalizedRevenueEvent,
  NormalizedSubscriptionState,
} from "./types";

const SOURCE_ID = "sample-stripe-source";

const createDate = (year: number, monthIndex: number, day: number) =>
  new Date(Date.UTC(year, monthIndex, day)).toISOString();

const round = (value: number) => Math.round(value * 100) / 100;

const sampleSource: IntegrationSource = {
  sourceId: SOURCE_ID,
  provider: "stripe",
  connectionLabel: "Sample Stripe Workspace",
  sourceKind: "payments",
  status: "connected",
};

const sampleOfferMappings: NormalizedOfferMapping[] = [
  {
    mappingId: "sample-map-core-subscription",
    offerKey: "sample-offer-core-subscription",
    offerName: "Core Platform",
    offerType: "software_subscription",
    sourceId: SOURCE_ID,
    externalProductKeys: ["prod_core_platform"],
    externalPriceKeys: ["price_core_monthly"],
    revenueClassification: "subscription_base",
  },
  {
    mappingId: "sample-map-ai-usage",
    offerKey: "sample-offer-ai-usage",
    offerName: "AI Copilot Suite",
    offerType: "software_hybrid_platform_usage",
    sourceId: SOURCE_ID,
    externalProductKeys: ["prod_ai_suite", "prod_ai_usage"],
    externalPriceKeys: ["price_ai_platform", "price_ai_usage"],
    revenueClassification: "hybrid_base",
  },
  {
    mappingId: "sample-map-enterprise-setup",
    offerKey: "sample-offer-enterprise-setup",
    offerName: "Enterprise Launch",
    offerType: "software_implementation_plus_subscription",
    sourceId: SOURCE_ID,
    externalProductKeys: ["prod_enterprise_setup", "prod_enterprise_subscription"],
    externalPriceKeys: ["price_enterprise_setup", "price_enterprise_subscription"],
    revenueClassification: "implementation",
  },
  {
    mappingId: "sample-map-pilot",
    offerKey: "sample-offer-paid-pilot",
    offerName: "Enterprise Pilot",
    offerType: "software_paid_pilot",
    sourceId: SOURCE_ID,
    externalProductKeys: ["prod_enterprise_pilot"],
    externalPriceKeys: ["price_enterprise_pilot"],
    revenueClassification: "pilot",
  },
];

const buildRecurringStates = ({
  prefix,
  year,
  monthIndex,
  startCustomers,
  retainedCustomers,
  newCustomers,
}: {
  prefix: string;
  year: number;
  monthIndex: number;
  startCustomers: number;
  retainedCustomers: number;
  newCustomers: number;
}): NormalizedSubscriptionState[] => {
  const states: NormalizedSubscriptionState[] = [];
  const churnedCustomers = Math.max(startCustomers - retainedCustomers, 0);
  const monthStart = createDate(year, monthIndex, 1);
  const monthMid = createDate(year, monthIndex, 15);
  const monthEnd = createDate(year, monthIndex + 1, 1);

  for (let index = 1; index <= retainedCustomers; index += 1) {
    states.push({
      subscriptionKey: `${prefix}-sub-retained-${year}-${monthIndex + 1}-${index}`,
      sourceId: SOURCE_ID,
      customerKey: `${prefix}-customer-retained-${index}`,
      offerKey: null,
      externalProductKey: null,
      externalPriceKey: null,
      status: "active",
      startedAt: createDate(year, Math.max(monthIndex - 5, 0), 1),
      canceledAt: null,
      currentPeriodStart: monthStart,
      currentPeriodEnd: monthEnd,
      billingInterval: "monthly",
    });
  }

  for (let index = 1; index <= churnedCustomers; index += 1) {
    states.push({
      subscriptionKey: `${prefix}-sub-churned-${year}-${monthIndex + 1}-${index}`,
      sourceId: SOURCE_ID,
      customerKey: `${prefix}-customer-churned-${monthIndex + 1}-${index}`,
      offerKey: null,
      externalProductKey: null,
      externalPriceKey: null,
      status: "active",
      startedAt: createDate(year, Math.max(monthIndex - 4, 0), 1),
      canceledAt: monthMid,
      currentPeriodStart: monthStart,
      currentPeriodEnd: monthEnd,
      billingInterval: "monthly",
    });
  }

  for (let index = 1; index <= newCustomers; index += 1) {
    states.push({
      subscriptionKey: `${prefix}-sub-new-${year}-${monthIndex + 1}-${index}`,
      sourceId: SOURCE_ID,
      customerKey: `${prefix}-customer-new-${year}-${monthIndex + 1}-${index}`,
      offerKey: null,
      externalProductKey: null,
      externalPriceKey: null,
      status: "active",
      startedAt: monthMid,
      canceledAt: null,
      currentPeriodStart: monthMid,
      currentPeriodEnd: monthEnd,
      billingInterval: "monthly",
    });
  }

  return states;
};

const buildRevenueEvent = ({
  revenueEventId,
  offerKey,
  externalProductKey,
  externalPriceKey,
  occurredAt,
  category,
  grossAmount,
  netAmount,
  quantity,
  unitAmount,
}: {
  revenueEventId: string;
  offerKey: string;
  externalProductKey: string;
  externalPriceKey: string;
  occurredAt: string;
  category: NormalizedRevenueEvent["category"];
  grossAmount: number;
  netAmount: number;
  quantity: number | null;
  unitAmount: number | null;
}): NormalizedRevenueEvent => ({
  revenueEventId,
  sourceId: SOURCE_ID,
  customerKey: null,
  offerKey,
  externalProductKey,
  externalPriceKey,
  occurredAt,
  servicePeriodStart: occurredAt,
  servicePeriodEnd: null,
  category,
  grossAmount: round(grossAmount),
  refundedAmount: round(Math.max(grossAmount - netAmount, 0)),
  netAmount: round(netAmount),
  currency: "USD",
  quantity,
  unitAmount: unitAmount == null ? null : round(unitAmount),
});

const buildRefundEvent = ({
  refundEventId,
  offerKey,
  occurredAt,
  amount,
}: {
  refundEventId: string;
  offerKey: string;
  occurredAt: string;
  amount: number;
}): NormalizedRefundEvent => ({
  refundEventId,
  sourceId: SOURCE_ID,
  customerKey: null,
  offerKey,
  occurredAt,
  amount: round(amount),
  currency: "USD",
  originalRevenueEventId: null,
});

const buildExpenseEvent = ({
  expenseEventId,
  offerKey,
  occurredAt,
  amount,
  category,
  mappedRole,
}: {
  expenseEventId: string;
  offerKey: string;
  occurredAt: string;
  amount: number;
  category: NormalizedExpenseEvent["category"];
  mappedRole: NormalizedExpenseEvent["mappedRole"];
}): NormalizedExpenseEvent => ({
  expenseEventId,
  sourceId: SOURCE_ID,
  occurredAt,
  amount: round(amount),
  currency: "USD",
  category,
  mappedRole,
  offerKey,
  externalAccountKey: null,
});

const buildMonthlyPayload = (
  year: number,
  monthIndex: number,
): IntegrationSyncPayload => {
  const startAt = createDate(year, monthIndex, 1);
  const endAt = createDate(year, monthIndex + 1, 1);
  const occurredAt = createDate(year, monthIndex, 28);

  const coreStart = 120 + monthIndex * 6;
  const coreRetentionRate = Math.max(0.88 - monthIndex * 0.003, 0.8);
  const coreRetained = Math.round(coreStart * coreRetentionRate);
  const coreNew = 18 + monthIndex * 2;
  const corePrice = 840 + monthIndex * 12;
  const coreGross = (coreRetained + coreNew) * corePrice;
  const coreRefunds = coreGross * (0.012 + monthIndex * 0.0007);
  const coreNet = coreGross - coreRefunds;

  const hybridStart = 52 + monthIndex * 4;
  const hybridRetentionRate = Math.max(0.9 - monthIndex * 0.002, 0.84);
  const hybridRetained = Math.round(hybridStart * hybridRetentionRate);
  const hybridNew = 7 + Math.floor(monthIndex / 2);
  const hybridPlatformFee = 420;
  const hybridUsageUnitsPerCustomer = 90 + monthIndex * 4;
  const hybridUsageUnitPrice = 4.1;
  const hybridUsageUnits = (hybridRetained + hybridNew) * hybridUsageUnitsPerCustomer;
  const hybridSubscriptionGross = (hybridRetained + hybridNew) * hybridPlatformFee;
  const hybridUsageGross = hybridUsageUnits * hybridUsageUnitPrice;
  const hybridRefunds = (hybridSubscriptionGross + hybridUsageGross) * 0.008;
  const hybridSubscriptionNet = hybridSubscriptionGross - hybridRefunds * 0.45;
  const hybridUsageNet = hybridUsageGross - hybridRefunds * 0.55;

  const enterpriseStart = 24 + monthIndex * 2;
  const enterpriseRetentionRate = Math.max(0.93 - monthIndex * 0.0015, 0.88);
  const enterpriseRetained = Math.round(enterpriseStart * enterpriseRetentionRate);
  const enterpriseNew = monthIndex % 3 === 0 ? 3 : 2;
  const enterpriseSubscriptionPrice = 1800;
  const enterpriseImplementationFee = 14500;
  const enterpriseSubscriptionGross =
    (enterpriseRetained + enterpriseNew) * enterpriseSubscriptionPrice;
  const enterpriseImplementationGross =
    enterpriseNew * enterpriseImplementationFee;
  const enterpriseRefunds =
    (enterpriseSubscriptionGross + enterpriseImplementationGross) * 0.004;
  const enterpriseSubscriptionNet = enterpriseSubscriptionGross - enterpriseRefunds * 0.25;
  const enterpriseImplementationNet =
    enterpriseImplementationGross - enterpriseRefunds * 0.75;

  const pilotNew = 3 + (monthIndex % 3);
  const pilotFee = 12000 + monthIndex * 150;
  const pilotGross = pilotNew * pilotFee;
  const pilotRefunds = pilotGross * 0.022;
  const pilotNet = pilotGross - pilotRefunds;

  return {
    window: {
      startAt,
      endAt,
      analysisPeriod: "monthly",
    },
    revenueEvents: [
      buildRevenueEvent({
        revenueEventId: `rev-core-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-core-subscription",
        externalProductKey: "prod_core_platform",
        externalPriceKey: "price_core_monthly",
        occurredAt,
        category: "subscription",
        grossAmount: coreGross,
        netAmount: coreNet,
        quantity: coreRetained + coreNew,
        unitAmount: corePrice,
      }),
      buildRevenueEvent({
        revenueEventId: `rev-hybrid-platform-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-ai-usage",
        externalProductKey: "prod_ai_suite",
        externalPriceKey: "price_ai_platform",
        occurredAt,
        category: "subscription",
        grossAmount: hybridSubscriptionGross,
        netAmount: hybridSubscriptionNet,
        quantity: hybridRetained + hybridNew,
        unitAmount: hybridPlatformFee,
      }),
      buildRevenueEvent({
        revenueEventId: `rev-hybrid-usage-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-ai-usage",
        externalProductKey: "prod_ai_usage",
        externalPriceKey: "price_ai_usage",
        occurredAt,
        category: "usage",
        grossAmount: hybridUsageGross,
        netAmount: hybridUsageNet,
        quantity: hybridUsageUnits,
        unitAmount: hybridUsageUnitPrice,
      }),
      buildRevenueEvent({
        revenueEventId: `rev-enterprise-subscription-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-enterprise-setup",
        externalProductKey: "prod_enterprise_subscription",
        externalPriceKey: "price_enterprise_subscription",
        occurredAt,
        category: "subscription",
        grossAmount: enterpriseSubscriptionGross,
        netAmount: enterpriseSubscriptionNet,
        quantity: enterpriseRetained + enterpriseNew,
        unitAmount: enterpriseSubscriptionPrice,
      }),
      buildRevenueEvent({
        revenueEventId: `rev-enterprise-implementation-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-enterprise-setup",
        externalProductKey: "prod_enterprise_setup",
        externalPriceKey: "price_enterprise_setup",
        occurredAt,
        category: "implementation",
        grossAmount: enterpriseImplementationGross,
        netAmount: enterpriseImplementationNet,
        quantity: enterpriseNew,
        unitAmount: enterpriseImplementationFee,
      }),
      buildRevenueEvent({
        revenueEventId: `rev-pilot-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-paid-pilot",
        externalProductKey: "prod_enterprise_pilot",
        externalPriceKey: "price_enterprise_pilot",
        occurredAt,
        category: "pilot",
        grossAmount: pilotGross,
        netAmount: pilotNet,
        quantity: pilotNew,
        unitAmount: pilotFee,
      }),
    ],
    refundEvents: [
      buildRefundEvent({
        refundEventId: `refund-core-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-core-subscription",
        occurredAt,
        amount: coreRefunds,
      }),
      buildRefundEvent({
        refundEventId: `refund-hybrid-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-ai-usage",
        occurredAt,
        amount: hybridRefunds,
      }),
      buildRefundEvent({
        refundEventId: `refund-enterprise-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-enterprise-setup",
        occurredAt,
        amount: enterpriseRefunds,
      }),
      buildRefundEvent({
        refundEventId: `refund-pilot-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-paid-pilot",
        occurredAt,
        amount: pilotRefunds,
      }),
    ],
    expenseEvents: [
      buildExpenseEvent({
        expenseEventId: `exp-core-marketing-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-core-subscription",
        occurredAt,
        amount: coreNew * 980,
        category: "marketing",
        mappedRole: "cac_eligible",
      }),
      buildExpenseEvent({
        expenseEventId: `exp-core-processing-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-core-subscription",
        occurredAt,
        amount: coreGross * 0.029,
        category: "processor_fees",
        mappedRole: "delivery_cost",
      }),
      buildExpenseEvent({
        expenseEventId: `exp-core-hosting-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-core-subscription",
        occurredAt,
        amount: coreStart * 28,
        category: "hosting",
        mappedRole: "delivery_cost",
      }),
      buildExpenseEvent({
        expenseEventId: `exp-core-support-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-core-subscription",
        occurredAt,
        amount: coreStart * 16,
        category: "support",
        mappedRole: "delivery_cost",
      }),
      buildExpenseEvent({
        expenseEventId: `exp-hybrid-marketing-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-ai-usage",
        occurredAt,
        amount: hybridNew * 1450,
        category: "marketing",
        mappedRole: "cac_eligible",
      }),
      buildExpenseEvent({
        expenseEventId: `exp-hybrid-processing-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-ai-usage",
        occurredAt,
        amount: (hybridSubscriptionGross + hybridUsageGross) * 0.029,
        category: "processor_fees",
        mappedRole: "delivery_cost",
      }),
      buildExpenseEvent({
        expenseEventId: `exp-hybrid-hosting-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-ai-usage",
        occurredAt,
        amount: hybridStart * 24,
        category: "hosting",
        mappedRole: "delivery_cost",
      }),
      buildExpenseEvent({
        expenseEventId: `exp-hybrid-ai-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-ai-usage",
        occurredAt,
        amount: hybridUsageUnits * 1.05,
        category: "ai_inference",
        mappedRole: "delivery_cost",
      }),
      buildExpenseEvent({
        expenseEventId: `exp-enterprise-marketing-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-enterprise-setup",
        occurredAt,
        amount: enterpriseNew * 3100,
        category: "marketing",
        mappedRole: "cac_eligible",
      }),
      buildExpenseEvent({
        expenseEventId: `exp-enterprise-processing-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-enterprise-setup",
        occurredAt,
        amount: (enterpriseSubscriptionGross + enterpriseImplementationGross) * 0.028,
        category: "processor_fees",
        mappedRole: "delivery_cost",
      }),
      buildExpenseEvent({
        expenseEventId: `exp-enterprise-hosting-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-enterprise-setup",
        occurredAt,
        amount: enterpriseStart * 22,
        category: "hosting",
        mappedRole: "delivery_cost",
      }),
      buildExpenseEvent({
        expenseEventId: `exp-enterprise-implementation-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-enterprise-setup",
        occurredAt,
        amount: enterpriseNew * 4800,
        category: "implementation_labor",
        mappedRole: "implementation_cost",
      }),
      buildExpenseEvent({
        expenseEventId: `exp-pilot-marketing-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-paid-pilot",
        occurredAt,
        amount: pilotNew * 1850,
        category: "marketing",
        mappedRole: "cac_eligible",
      }),
      buildExpenseEvent({
        expenseEventId: `exp-pilot-processing-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-paid-pilot",
        occurredAt,
        amount: pilotGross * 0.028,
        category: "processor_fees",
        mappedRole: "delivery_cost",
      }),
      buildExpenseEvent({
        expenseEventId: `exp-pilot-delivery-${year}-${monthIndex + 1}`,
        offerKey: "sample-offer-paid-pilot",
        occurredAt,
        amount: pilotGross * 0.19,
        category: "cogs",
        mappedRole: "delivery_cost",
      }),
    ],
    subscriptionStates: [
      ...buildRecurringStates({
        prefix: "core",
        year,
        monthIndex,
        startCustomers: coreStart,
        retainedCustomers: coreRetained,
        newCustomers: coreNew,
      }),
      ...buildRecurringStates({
        prefix: "hybrid",
        year,
        monthIndex,
        startCustomers: hybridStart,
        retainedCustomers: hybridRetained,
        newCustomers: hybridNew,
      }),
      ...buildRecurringStates({
        prefix: "enterprise",
        year,
        monthIndex,
        startCustomers: enterpriseStart,
        retainedCustomers: enterpriseRetained,
        newCustomers: enterpriseNew,
      }),
    ],
  };
};

export const createSampleStripeSeed = (year: number) => ({
  source: sampleSource,
  offerMappings: sampleOfferMappings,
  payloads: Array.from({ length: 12 }, (_, monthIndex) =>
    buildMonthlyPayload(year, monthIndex),
  ),
});

export const runSampleStripeImports = (year: number): IntegrationSyncResult[] => {
  const seed = createSampleStripeSeed(year);
  return seed.payloads.map((payload) =>
    runIntegrationSync({
      sources: [seed.source],
      offerMappings: seed.offerMappings,
      accountMappings: [],
      payload,
    }),
  );
};
