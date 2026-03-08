import type {
  AnyKpiInput,
  KPIInput,
  KpiPeriod,
  OfferInput,
  SoftwarePaidPilotInput,
  SubscriptionOfferInput,
} from "./types";

export const isLegacyKpiInput = (input: AnyKpiInput): input is KPIInput => {
  return "businessModel" in input;
};

export const isOfferInput = (input: AnyKpiInput): input is OfferInput => {
  return "offerType" in input;
};

export const isSubscriptionOfferInput = (
  input: AnyKpiInput,
): input is SubscriptionOfferInput => {
  return (
    isOfferInput(input) &&
    (input.offerType === "subscription" ||
      input.offerType === "software_subscription")
  );
};

export const isSoftwarePaidPilotInput = (
  input: AnyKpiInput,
): input is SoftwarePaidPilotInput => {
  return isOfferInput(input) && input.offerType === "software_paid_pilot";
};

export const getInputPeriod = (input: AnyKpiInput): KpiPeriod => {
  return isLegacyKpiInput(input) ? input.period : input.analysisPeriod;
};

export const getInputModelLabel = (input: AnyKpiInput): string => {
  if (isLegacyKpiInput(input)) {
    return input.businessModel;
  }

  if (
    isOfferInput(input) &&
    "softwareConfig" in input &&
    input.softwareConfig?.industryPreset === "software_tech"
  ) {
    return input.softwareConfig.monetizationModel;
  }

  return input.offerType;
};

export const getOfferMetadata = (input: AnyKpiInput) => {
  if (isLegacyKpiInput(input)) {
    return {
      offerId: null,
      offerName: null,
      offerType: null,
    };
  }
  return {
    offerId: input.offerId,
    offerName: input.offerName,
    offerType: input.offerType,
  };
};

export const adaptLegacyInputToSubscriptionOffer = (
  input: KPIInput,
): SubscriptionOfferInput => {
  const offerNameByModel: Record<KPIInput["businessModel"], string> = {
    subscription: "Legacy Subscription Offer",
    transactional: "Legacy Transactional Offer",
    hybrid: "Legacy Hybrid Offer",
  };
  return {
    offerId: `legacy-${input.businessModel}`,
    offerName: offerNameByModel[input.businessModel],
    offerType: "subscription",
    analysisPeriod: input.period,
    revenuePerPeriod: input.revenuePerPeriod,
    grossMargin: input.grossMargin,
    marketingSpendPerPeriod: input.marketingSpendPerPeriod,
    newCustomersPerPeriod: input.newCustomersPerPeriod,
    activeCustomersStart: input.activeCustomersStart,
    churnedCustomersPerPeriod: input.churnedCustomersPerPeriod,
    retainedCustomersFromStartAtEnd: input.retainedCustomersFromStartAtEnd,
  };
};
