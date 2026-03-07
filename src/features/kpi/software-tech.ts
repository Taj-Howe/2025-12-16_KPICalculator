export const softwareTechOfferTypes = [
  "software_subscription",
  "software_paid_pilot",
  "software_pilot_to_subscription",
  "software_token_pricing",
  "software_token_plus_platform",
  "software_implementation_plus_subscription",
  "software_transaction_fee",
  "software_hybrid_platform_usage",
] as const;

export type SoftwareTechOfferType = (typeof softwareTechOfferTypes)[number];

export const softwareTechMonetizationModels = [
  "subscription_seat_based",
  "subscription_usage_based",
  "subscription_hybrid",
  "paid_pilot",
  "pilot_to_subscription",
  "token_pricing",
  "token_plus_platform_fee",
  "implementation_plus_subscription",
  "transaction_fee",
] as const;

export type SoftwareTechMonetizationModel =
  (typeof softwareTechMonetizationModels)[number];

export const softwareSubscriptionModels = [
  "subscription_seat_based",
  "subscription_usage_based",
  "subscription_hybrid",
] as const;

export type SoftwareSubscriptionModel =
  (typeof softwareSubscriptionModels)[number];

export const softwareRevenueComponentTypes = [
  "platform_subscription",
  "seat_subscription",
  "usage_metered",
  "token_usage",
  "pilot_fee",
  "implementation_fee",
  "transaction_fee",
] as const;

export type SoftwareRevenueComponentType =
  (typeof softwareRevenueComponentTypes)[number];

export type SoftwareGoToMarketMotion =
  | "self_serve"
  | "product_led"
  | "sales_led"
  | "enterprise"
  | "channel_partner";

export type PlatformSubscriptionComponent = {
  componentType: "platform_subscription";
  label: string;
  pricingMetric?: "workspace" | "account" | "organization";
};

export type SeatSubscriptionComponent = {
  componentType: "seat_subscription";
  label: string;
  pricingMetric?: "seat" | "active_user" | "licensed_user";
};

export type UsageMeteredComponent = {
  componentType: "usage_metered";
  label: string;
  unitName: string;
};

export type TokenUsageComponent = {
  componentType: "token_usage";
  label: string;
  tokenUnit: "1k_tokens" | "1m_tokens";
};

export type PilotFeeComponent = {
  componentType: "pilot_fee";
  label: string;
};

export type ImplementationFeeComponent = {
  componentType: "implementation_fee";
  label: string;
};

export type TransactionFeeComponent = {
  componentType: "transaction_fee";
  label: string;
  pricingMetric?: "gsv" | "tpv" | "order_volume";
};

export type SoftwareRevenueComponent =
  | PlatformSubscriptionComponent
  | SeatSubscriptionComponent
  | UsageMeteredComponent
  | TokenUsageComponent
  | PilotFeeComponent
  | ImplementationFeeComponent
  | TransactionFeeComponent;

export type SoftwareTechConfig = {
  industryPreset: "software_tech";
  monetizationModel: SoftwareTechMonetizationModel;
  revenueComponents: SoftwareRevenueComponent[];
  goToMarketMotion?: SoftwareGoToMarketMotion;
  notes?: string;
};

export const isSoftwareSubscriptionModel = (
  model: SoftwareTechMonetizationModel,
): model is SoftwareSubscriptionModel => {
  return softwareSubscriptionModels.includes(
    model as SoftwareSubscriptionModel,
  );
};
