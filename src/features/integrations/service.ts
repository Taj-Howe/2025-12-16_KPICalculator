import type {
  ImportedSnapshotToCalculatorResult,
  IntegrationSource,
  IntegrationSyncPayload,
  IntegrationSyncResult,
  NormalizedExpenseEvent,
  NormalizedOfferMapping,
  NormalizedOfferPeriodSnapshot,
  NormalizedRevenueEvent,
  NormalizedSubscriptionState,
  AccountMapping,
  ImportedOfferType,
} from "./types";
import type { SoftwareTechConfig } from "@/features/kpi/software-tech";

const toDate = (value: string | null) => (value == null ? null : new Date(value));

const isWithinWindow = (value: string, start: Date, end: Date) => {
  const timestamp = new Date(value).getTime();
  return timestamp >= start.getTime() && timestamp < end.getTime();
};

const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);

const uniqueCount = (values: Array<string | null | undefined>) =>
  new Set(values.filter((value): value is string => typeof value === "string")).size;

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const buildSoftwareConfig = (offerType: ImportedOfferType): SoftwareTechConfig => {
  if (offerType === "software_paid_pilot") {
    return {
      industryPreset: "software_tech",
      monetizationModel: "paid_pilot",
      revenueComponents: [{ componentType: "pilot_fee", label: "Imported pilot" }],
    };
  }

  if (offerType === "software_token_pricing") {
    return {
      industryPreset: "software_tech",
      monetizationModel: "token_pricing",
      revenueComponents: [
        { componentType: "token_usage", label: "Imported usage", tokenUnit: "1m_tokens" },
      ],
    };
  }

  if (offerType === "software_hybrid_platform_usage") {
    return {
      industryPreset: "software_tech",
      monetizationModel: "subscription_hybrid",
      revenueComponents: [
        {
          componentType: "platform_subscription",
          label: "Imported platform",
          pricingMetric: "workspace",
        },
        {
          componentType: "usage_metered",
          label: "Imported usage",
          unitName: "usage_unit",
        },
      ],
    };
  }

  if (offerType === "software_implementation_plus_subscription") {
    return {
      industryPreset: "software_tech",
      monetizationModel: "implementation_plus_subscription",
      revenueComponents: [
        { componentType: "implementation_fee", label: "Imported implementation" },
        {
          componentType: "platform_subscription",
          label: "Imported subscription",
          pricingMetric: "workspace",
        },
      ],
    };
  }

  return {
    industryPreset: "software_tech",
    monetizationModel: "subscription_seat_based",
    revenueComponents: [
      {
        componentType: "platform_subscription",
        label: "Imported subscription",
        pricingMetric: "workspace",
      },
    ],
  };
};

const isActiveAt = (state: NormalizedSubscriptionState, boundary: Date) => {
  const start = toDate(state.startedAt);
  const canceled = toDate(state.canceledAt);
  const activeStatus =
    state.status === "active" || state.status === "trialing" || state.status === "past_due";

  return (
    activeStatus &&
    (start == null || start.getTime() <= boundary.getTime()) &&
    (canceled == null || canceled.getTime() > boundary.getTime())
  );
};

const resolveOfferKeyFromRevenue = (
  event: NormalizedRevenueEvent,
  offerMappings: NormalizedOfferMapping[],
) => {
  if (event.offerKey != null) {
    return event.offerKey;
  }

  const mapping = offerMappings.find(
    (candidate) =>
      candidate.sourceId === event.sourceId &&
      ((event.externalProductKey != null &&
        candidate.externalProductKeys.includes(event.externalProductKey)) ||
        (event.externalPriceKey != null &&
          candidate.externalPriceKeys.includes(event.externalPriceKey))),
  );

  return mapping?.offerKey ?? null;
};

const resolveOfferKeyFromSubscription = (
  state: NormalizedSubscriptionState,
  offerMappings: NormalizedOfferMapping[],
) => {
  if (state.offerKey != null) {
    return state.offerKey;
  }

  const mapping = offerMappings.find(
    (candidate) =>
      candidate.sourceId === state.sourceId &&
      ((state.externalProductKey != null &&
        candidate.externalProductKeys.includes(state.externalProductKey)) ||
        (state.externalPriceKey != null &&
          candidate.externalPriceKeys.includes(state.externalPriceKey))),
  );

  return mapping?.offerKey ?? null;
};

const resolveExpenseOfferAndRole = (
  event: NormalizedExpenseEvent,
  accountMappings: AccountMapping[],
) => {
  if (event.mappedRole != null || event.offerKey != null) {
    return {
      mappedRole: event.mappedRole,
      offerKey: event.offerKey,
      category: event.category,
    };
  }

  if (event.externalAccountKey == null) {
    return {
      mappedRole: null,
      offerKey: null,
      category: event.category,
    };
  }

  const mapping = accountMappings.find(
    (candidate) =>
      candidate.sourceId === event.sourceId &&
      candidate.externalAccountKey === event.externalAccountKey,
  );

  return {
    mappedRole: mapping?.mappedRole ?? null,
    offerKey: mapping?.offerKey ?? null,
    category: mapping?.expenseCategory ?? event.category,
  };
};

const deriveCompleteness = (missingFields: string[]) => {
  if (missingFields.length <= 2) {
    return "high" as const;
  }
  if (missingFields.length <= 5) {
    return "medium" as const;
  }
  return "low" as const;
};

export const deriveOfferPeriodSnapshots = ({
  sources,
  offerMappings,
  accountMappings,
  payload,
}: {
  sources: IntegrationSource[];
  offerMappings: NormalizedOfferMapping[];
  accountMappings: AccountMapping[];
  payload: IntegrationSyncPayload;
}): NormalizedOfferPeriodSnapshot[] => {
  const start = new Date(payload.window.startAt);
  const end = new Date(payload.window.endAt);
  const revenueEvents = payload.revenueEvents ?? [];
  const refundEvents = payload.refundEvents ?? [];
  const expenseEvents = payload.expenseEvents ?? [];
  const subscriptionStates = payload.subscriptionStates ?? [];

  return offerMappings.map((mapping) => {
    const sourceKnown = sources.some((source) => source.sourceId === mapping.sourceId);
    const mappedRevenue = revenueEvents.filter((event) => {
      if (!isWithinWindow(event.occurredAt, start, end)) {
        return false;
      }
      return resolveOfferKeyFromRevenue(event, offerMappings) === mapping.offerKey;
    });
    const mappedRefunds = refundEvents.filter((event) => {
      if (!isWithinWindow(event.occurredAt, start, end)) {
        return false;
      }
      return event.offerKey === mapping.offerKey;
    });
    const mappedExpenses = expenseEvents
      .map((event) => ({
        event,
        resolved: resolveExpenseOfferAndRole(event, accountMappings),
      }))
      .filter(({ event, resolved }) => {
        if (!isWithinWindow(event.occurredAt, start, end)) {
          return false;
        }
        return resolved.offerKey === mapping.offerKey;
      });
    const mappedSubscriptions = subscriptionStates.filter(
      (state) => resolveOfferKeyFromSubscription(state, offerMappings) === mapping.offerKey,
    );

    const startCohort = mappedSubscriptions.filter((state) => isActiveAt(state, start));
    const endCohort = mappedSubscriptions.filter((state) => isActiveAt(state, end));
    const retainedFromStart = startCohort.filter((state) => isActiveAt(state, end)).length;
    const churnedFromStart = startCohort.length - retainedFromStart;

    const newRecurringCustomers = uniqueCount(
      mappedSubscriptions
        .filter((state) => state.startedAt != null && isWithinWindow(state.startedAt, start, end))
        .map((state) => state.customerKey),
    );

    const newRevenueCustomers = uniqueCount(
      mappedRevenue
        .filter((event) => event.customerKey != null)
        .map((event) => event.customerKey),
    );

    const grossReceipts = sum(
      mappedRevenue
        .filter((event) => event.category !== "tax" && event.category !== "processor_fee_adjustment")
        .map((event) => event.grossAmount),
    );
    const refunds = sum(mappedRefunds.map((event) => event.amount));
    const recognizedRevenueApproxRaw = sum(
      mappedRevenue
        .filter((event) => event.category !== "tax" && event.category !== "processor_fee_adjustment")
        .map((event) => event.netAmount),
    );
    const subscriptionRevenue = sum(
      mappedRevenue
        .filter((event) => event.category === "subscription")
        .map((event) => event.netAmount),
    );
    const usageRevenue = sum(
      mappedRevenue
        .filter((event) => event.category === "usage")
        .map((event) => event.netAmount),
    );
    const pilotRevenue = sum(
      mappedRevenue
        .filter((event) => event.category === "pilot")
        .map((event) => event.netAmount),
    );
    const implementationRevenue = sum(
      mappedRevenue
        .filter((event) => event.category === "implementation")
        .map((event) => event.netAmount),
    );

    const marketingSpend = sum(
      mappedExpenses
        .filter(({ resolved }) => resolved.category === "marketing")
        .map(({ event }) => event.amount),
    );
    const salesSpend = sum(
      mappedExpenses
        .filter(({ resolved }) => resolved.category === "sales")
        .map(({ event }) => event.amount),
    );
    const cacEligibleSpend = sum(
      mappedExpenses
        .filter(({ resolved }) => resolved.mappedRole === "cac_eligible")
        .map(({ event }) => event.amount),
    );
    const cogs = sum(
      mappedExpenses
        .filter(({ resolved }) => resolved.category === "cogs")
        .map(({ event }) => event.amount),
    );
    const processorFees = sum(
      mappedExpenses
        .filter(({ resolved }) => resolved.category === "processor_fees")
        .map(({ event }) => event.amount),
    );
    const hostingCost = sum(
      mappedExpenses
        .filter(({ resolved }) => resolved.category === "hosting")
        .map(({ event }) => event.amount),
    );
    const aiInferenceCost = sum(
      mappedExpenses
        .filter(({ resolved }) => resolved.category === "ai_inference")
        .map(({ event }) => event.amount),
    );
    const supportCost = sum(
      mappedExpenses
        .filter(({ resolved }) => resolved.category === "support")
        .map(({ event }) => event.amount),
    );
    const implementationCost = sum(
      mappedExpenses
        .filter(
          ({ resolved }) =>
            resolved.category === "implementation_labor" ||
            resolved.mappedRole === "implementation_cost",
        )
        .map(({ event }) => event.amount),
    );

    const totalUsageUnits = sum(
      mappedRevenue
        .filter((event) => event.category === "usage")
        .map((event) => event.quantity ?? 0),
    );

    const activeCustomersStart = startCohort.length || null;
    const activeCustomersEnd = endCohort.length || null;
    const newCustomers =
      mapping.offerType === "software_paid_pilot"
        ? newRevenueCustomers || null
        : newRecurringCustomers || newRevenueCustomers || null;
    const directChurnRate =
      activeCustomersStart != null && activeCustomersStart > 0
        ? churnedFromStart / activeCustomersStart
        : null;

    const recognizedRevenueApprox =
      recognizedRevenueApproxRaw > 0 ? recognizedRevenueApproxRaw : grossReceipts - refunds;
    const netReceipts = grossReceipts - refunds;
    const deliveryTotal =
      cogs + processorFees + hostingCost + aiInferenceCost + supportCost + implementationCost;
    const observableGrossMargin =
      recognizedRevenueApprox > 0
        ? (recognizedRevenueApprox - deliveryTotal) / recognizedRevenueApprox
        : null;
    const usageUnitsPerCustomer =
      totalUsageUnits > 0 && activeCustomersStart != null && activeCustomersStart > 0
        ? totalUsageUnits / activeCustomersStart
        : null;
    const pricePerUsageUnit =
      totalUsageUnits > 0 ? usageRevenue / totalUsageUnits : null;
    const costPerUsageUnit =
      totalUsageUnits > 0 && aiInferenceCost > 0 ? aiInferenceCost / totalUsageUnits : null;
    const directCac =
      newCustomers != null && newCustomers > 0 && cacEligibleSpend > 0
        ? cacEligibleSpend / newCustomers
        : null;

    const missingFields: string[] = [];
    const assumptions: string[] = [];
    const warnings: string[] = [];

    if (!sourceKnown) {
      warnings.push("Snapshot includes mappings for a source that is not currently registered.");
    }
    if (recognizedRevenueApproxRaw <= 0 && netReceipts > 0) {
      assumptions.push("Used net receipts as a fallback for recognized revenue approximation.");
    }
    if (cacEligibleSpend === 0) {
      missingFields.push("acquisition.cacEligibleSpend");
      warnings.push("No CAC-eligible spend mapping was available for this offer.");
    }
    if (observableGrossMargin == null) {
      missingFields.push("delivery.observableGrossMargin");
    }
    if (
      activeCustomersStart == null ||
      activeCustomersEnd == null ||
      retainedFromStart === 0 && startCohort.length === 0
    ) {
      warnings.push("Retention quality is weak because recurring cohort state is incomplete.");
    }
    if (mapping.offerType !== "software_paid_pilot" && activeCustomersStart == null) {
      missingFields.push("customers.activeCustomersStart");
    }
    if (
      mapping.offerType === "software_token_pricing" ||
      mapping.offerType === "software_hybrid_platform_usage"
    ) {
      if (usageUnitsPerCustomer == null) {
        missingFields.push("usage.usageUnitsPerCustomer");
      }
      if (pricePerUsageUnit == null) {
        missingFields.push("usage.pricePerUsageUnit");
      }
    }

    return {
      snapshotId: createId("snapshot"),
      offerKey: mapping.offerKey,
      offerName: mapping.offerName,
      offerType: mapping.offerType,
      analysisPeriod: payload.window.analysisPeriod,
      windowStart: payload.window.startAt,
      windowEnd: payload.window.endAt,
      revenue: {
        grossReceipts: grossReceipts || null,
        refunds: refunds || null,
        netReceipts: netReceipts || null,
        recognizedRevenueApprox: recognizedRevenueApprox || null,
        subscriptionRevenue: subscriptionRevenue || null,
        usageRevenue: usageRevenue || null,
        pilotRevenue: pilotRevenue || null,
        implementationRevenue: implementationRevenue || null,
      },
      customers: {
        activeCustomersStart,
        activeCustomersEnd,
        newCustomers,
        retainedFromStart: activeCustomersStart != null ? retainedFromStart : null,
        churnedFromStart: activeCustomersStart != null ? churnedFromStart : null,
        directChurnRate,
      },
      acquisition: {
        marketingSpend: marketingSpend || null,
        salesSpend: salesSpend || null,
        cacEligibleSpend: cacEligibleSpend || null,
        directCac,
      },
      delivery: {
        cogs: cogs || null,
        processorFees: processorFees || null,
        hostingCost: hostingCost || null,
        aiInferenceCost: aiInferenceCost || null,
        supportCost: supportCost || null,
        implementationCost: implementationCost || null,
        observableGrossMargin,
      },
      usage: {
        totalUsageUnits: totalUsageUnits || null,
        usageUnitsPerCustomer,
        pricePerUsageUnit,
        costPerUsageUnit,
      },
      quality: {
        dataCompleteness: deriveCompleteness(missingFields),
        missingFields,
        assumptions,
        warnings,
      },
    };
  });
};

export const mapSnapshotToCalculatorInput = (
  snapshot: NormalizedOfferPeriodSnapshot,
): ImportedSnapshotToCalculatorResult => {
  const unmappedFields: string[] = [];
  const assumptionsApplied = [...snapshot.quality.assumptions];
  const warnings = [...snapshot.quality.warnings];

  const requireNumber = (value: number | null, field: string) => {
    if (value == null) {
      unmappedFields.push(field);
      return null;
    }
    return value;
  };

  const base = {
    offerId: snapshot.offerKey,
    offerName: snapshot.offerName,
    analysisPeriod: snapshot.analysisPeriod,
    newCustomersPerPeriod: snapshot.customers.newCustomers ?? 0,
    softwareConfig: buildSoftwareConfig(snapshot.offerType),
    cacInputMode:
      snapshot.acquisition.cacEligibleSpend != null ? ("derived" as const) : ("direct" as const),
    marketingSpendPerPeriod: snapshot.acquisition.cacEligibleSpend ?? undefined,
    directCac:
      snapshot.acquisition.cacEligibleSpend == null
        ? snapshot.acquisition.directCac ?? undefined
        : undefined,
  };

  if (snapshot.offerType === "software_subscription") {
    const revenue = requireNumber(
      snapshot.revenue.subscriptionRevenue ??
        snapshot.revenue.recognizedRevenueApprox ??
        snapshot.revenue.netReceipts,
      "revenue.subscriptionRevenue",
    );
    const activeStart = requireNumber(
      snapshot.customers.activeCustomersStart,
      "customers.activeCustomersStart",
    );
    if (
      revenue == null ||
      activeStart == null ||
      snapshot.customers.retainedFromStart == null
    ) {
      if (snapshot.customers.retainedFromStart == null) {
        unmappedFields.push("customers.retainedFromStart");
      }
      return { offerInput: null, unmappedFields, assumptionsApplied, warnings };
    }

    const grossMargin =
      snapshot.delivery.observableGrossMargin ?? (unmappedFields.push("delivery.observableGrossMargin"), null);
    if (grossMargin == null) {
      return { offerInput: null, unmappedFields, assumptionsApplied, warnings };
    }

    return {
      offerInput: {
        ...base,
        offerType: "software_subscription",
        revenueInputMode: "total_revenue",
        revenuePerPeriod: revenue,
        grossProfitInputMode: "margin",
        grossMargin,
        retentionInputMode: "counts",
        activeCustomersStart: activeStart,
        retainedCustomersFromStartAtEnd: snapshot.customers.retainedFromStart,
      },
      unmappedFields,
      assumptionsApplied,
      warnings,
    };
  }

  if (snapshot.offerType === "software_paid_pilot") {
    const newCustomers = requireNumber(snapshot.customers.newCustomers, "customers.newCustomers");
    const pilotRevenue = requireNumber(snapshot.revenue.pilotRevenue, "revenue.pilotRevenue");
    const grossMargin =
      snapshot.delivery.observableGrossMargin ?? (unmappedFields.push("delivery.observableGrossMargin"), null);
    if (newCustomers == null || pilotRevenue == null || newCustomers <= 0 || grossMargin == null) {
      return { offerInput: null, unmappedFields, assumptionsApplied, warnings };
    }

    return {
      offerInput: {
        ...base,
        offerType: "software_paid_pilot",
        newCustomersPerPeriod: newCustomers,
        pilotFeePerNewCustomer: pilotRevenue / newCustomers,
        pilotGrossMargin: grossMargin,
      },
      unmappedFields,
      assumptionsApplied,
      warnings,
    };
  }

  if (snapshot.offerType === "software_token_pricing") {
    const activeStart = requireNumber(
      snapshot.customers.activeCustomersStart,
      "customers.activeCustomersStart",
    );
    const retained = requireNumber(
      snapshot.customers.retainedFromStart,
      "customers.retainedFromStart",
    );
    const usageUnitsPerCustomer = requireNumber(
      snapshot.usage.usageUnitsPerCustomer,
      "usage.usageUnitsPerCustomer",
    );
    const pricePerUsageUnit = requireNumber(
      snapshot.usage.pricePerUsageUnit,
      "usage.pricePerUsageUnit",
    );
    const costPerUsageUnit = requireNumber(
      snapshot.usage.costPerUsageUnit,
      "usage.costPerUsageUnit",
    );
    if (
      activeStart == null ||
      retained == null ||
      usageUnitsPerCustomer == null ||
      pricePerUsageUnit == null ||
      costPerUsageUnit == null
    ) {
      return { offerInput: null, unmappedFields, assumptionsApplied, warnings };
    }
    return {
      offerInput: {
        ...base,
        offerType: "software_token_pricing",
        activeCustomersStart: activeStart,
        retentionInputMode: "counts",
        retainedCustomersFromStartAtEnd: retained,
        usageUnitsPerCustomerPerPeriod: usageUnitsPerCustomer,
        pricePerUsageUnit,
        costPerUsageUnit,
      },
      unmappedFields,
      assumptionsApplied,
      warnings,
    };
  }

  if (snapshot.offerType === "software_hybrid_platform_usage") {
    const activeStart = requireNumber(
      snapshot.customers.activeCustomersStart,
      "customers.activeCustomersStart",
    );
    const retained = requireNumber(
      snapshot.customers.retainedFromStart,
      "customers.retainedFromStart",
    );
    const platformRevenue = requireNumber(
      snapshot.revenue.subscriptionRevenue,
      "revenue.subscriptionRevenue",
    );
    const usageUnitsPerCustomer = requireNumber(
      snapshot.usage.usageUnitsPerCustomer,
      "usage.usageUnitsPerCustomer",
    );
    const pricePerUsageUnit = requireNumber(
      snapshot.usage.pricePerUsageUnit,
      "usage.pricePerUsageUnit",
    );
    if (
      activeStart == null ||
      retained == null ||
      platformRevenue == null ||
      usageUnitsPerCustomer == null ||
      pricePerUsageUnit == null
    ) {
      return { offerInput: null, unmappedFields, assumptionsApplied, warnings };
    }
    const platformFee = activeStart > 0 ? platformRevenue / activeStart : 0;
    return {
      offerInput: {
        ...base,
        offerType: "software_hybrid_platform_usage",
        activeCustomersStart: activeStart,
        retentionInputMode: "counts",
        retainedCustomersFromStartAtEnd: retained,
        platformFeePerCustomerPerPeriod: platformFee,
        usageUnitsPerCustomerPerPeriod: usageUnitsPerCustomer,
        pricePerUsageUnit,
        costPerUsageUnit: snapshot.usage.costPerUsageUnit ?? undefined,
      },
      unmappedFields,
      assumptionsApplied,
      warnings,
    };
  }

  const activeStart = requireNumber(
    snapshot.customers.activeCustomersStart,
    "customers.activeCustomersStart",
  );
  const retained = requireNumber(
    snapshot.customers.retainedFromStart,
    "customers.retainedFromStart",
  );
  const recurringRevenue = requireNumber(
    snapshot.revenue.subscriptionRevenue,
    "revenue.subscriptionRevenue",
  );
  const implementationRevenue = requireNumber(
    snapshot.revenue.implementationRevenue,
    "revenue.implementationRevenue",
  );
  const newCustomers = requireNumber(snapshot.customers.newCustomers, "customers.newCustomers");
  const grossMargin =
    snapshot.delivery.observableGrossMargin ?? (unmappedFields.push("delivery.observableGrossMargin"), null);
  if (
    activeStart == null ||
    retained == null ||
    recurringRevenue == null ||
    implementationRevenue == null ||
    newCustomers == null ||
    newCustomers <= 0 ||
    grossMargin == null
  ) {
    return { offerInput: null, unmappedFields, assumptionsApplied, warnings };
  }

  return {
    offerInput: {
      ...base,
      offerType: "software_implementation_plus_subscription",
      activeCustomersStart: activeStart,
      retentionInputMode: "counts",
      retainedCustomersFromStartAtEnd: retained,
      directArpc: activeStart > 0 ? recurringRevenue / activeStart : 0,
      grossProfitInputMode: "margin",
      grossMargin,
      implementationFeePerNewCustomer: implementationRevenue / newCustomers,
      implementationGrossMargin: grossMargin,
    },
    unmappedFields,
    assumptionsApplied,
    warnings,
  };
};

export const runIntegrationSync = ({
  sources,
  offerMappings,
  accountMappings,
  payload,
}: {
  sources: IntegrationSource[];
  offerMappings: NormalizedOfferMapping[];
  accountMappings: AccountMapping[];
  payload: IntegrationSyncPayload;
}): IntegrationSyncResult => {
  const snapshots = deriveOfferPeriodSnapshots({
    sources,
    offerMappings,
    accountMappings,
    payload,
  });

  return {
    syncId: createId("sync"),
    createdAt: new Date().toISOString(),
    window: payload.window,
    snapshots,
    summary: {
      sourceCount: sources.length,
      offerCount: offerMappings.length,
      revenueEventCount: payload.revenueEvents?.length ?? 0,
      refundEventCount: payload.refundEvents?.length ?? 0,
      expenseEventCount: payload.expenseEvents?.length ?? 0,
      subscriptionStateCount: payload.subscriptionStates?.length ?? 0,
      snapshotCount: snapshots.length,
    },
  };
};
