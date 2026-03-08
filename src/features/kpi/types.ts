import type {
  EcommerceConfig,
  EcommerceOfferType,
} from "./ecommerce";
import type {
  SoftwareTechConfig,
  SoftwareTechOfferType,
} from "./software-tech";

export type KpiPeriod = "monthly" | "quarterly" | "yearly";

export type BusinessModel = "subscription" | "transactional" | "hybrid";

export type LegacyOfferType =
  | "subscription"
  | "one_time"
  | "installment"
  | "usage_based"
  | "service_retainer";

export type OfferType =
  | LegacyOfferType
  | SoftwareTechOfferType
  | EcommerceOfferType;

export type CalculationVersion =
  | "kpi-v1-legacy-model"
  | "kpi-v2-subscription-offer"
  | "kpi-v2-subscription-offer-flexible-inputs";

export type CacInputMode = "derived" | "direct";
export type GrossProfitInputMode = "margin" | "costs";
export type RetentionInputMode = "counts" | "rate";
export type RevenueInputMode = "total_revenue" | "direct_arpc";
export type CalculatorMode = "unit_economics" | "business_metrics";

export type KPIInput = {
  period: KpiPeriod;
  businessModel: BusinessModel;
  revenuePerPeriod: number;
  grossMargin: number;
  marketingSpendPerPeriod: number;
  newCustomersPerPeriod: number;
  activeCustomersStart: number;
  activeCustomersEnd?: number;
  churnedCustomersPerPeriod?: number;
  retainedCustomersFromStartAtEnd?: number;
  retentionRatePerPeriod?: number;
};

export type SubscriptionOfferInput = {
  offerId: string;
  offerName: string;
  offerType: "subscription" | "software_subscription";
  analysisPeriod: KpiPeriod;
  calculatorMode?: CalculatorMode;
  revenueInputMode?: RevenueInputMode;
  revenuePerPeriod?: number;
  directArpc?: number;
  grossProfitInputMode?: GrossProfitInputMode;
  grossMargin?: number;
  deliveryCostPerCustomerPerPeriod?: number;
  fixedDeliveryCostPerPeriod?: number;
  cacInputMode?: CacInputMode;
  marketingSpendPerPeriod?: number;
  directCac?: number;
  retentionInputMode?: RetentionInputMode;
  newCustomersPerPeriod: number;
  activeCustomersStart?: number;
  directChurnRatePerPeriod?: number;
  churnedCustomersPerPeriod?: number;
  retainedCustomersFromStartAtEnd?: number;
  softwareConfig?: SoftwareTechConfig;
};

export type SoftwareOfferInputBase = {
  offerId: string;
  offerName: string;
  analysisPeriod: KpiPeriod;
  softwareConfig: SoftwareTechConfig;
  newCustomersPerPeriod: number;
  cacInputMode?: CacInputMode;
  marketingSpendPerPeriod?: number;
  directCac?: number;
};

export type EcommerceOfferInputBase = {
  offerId: string;
  offerName: string;
  analysisPeriod: KpiPeriod;
  ecommerceConfig: EcommerceConfig;
  newCustomersPerPeriod: number;
  cacInputMode?: CacInputMode;
  marketingSpendPerPeriod?: number;
  directCac?: number;
};

export type EcommerceOneTimeProductInput = EcommerceOfferInputBase & {
  offerType: "ecommerce_one_time_product";
  averageOrderValue: number;
  grossProfitPerOrder?: number;
  grossMargin?: number;
  refundsRatePerOrder?: number;
};

export type EcommerceRepeatPurchaseProductInput = EcommerceOfferInputBase & {
  offerType: "ecommerce_repeat_purchase_product";
  averageOrderValue: number;
  grossProfitPerOrder?: number;
  grossMargin?: number;
  refundsRatePerOrder?: number;
  repeatInputMode?: "orders_per_customer" | "repurchase_rate";
  expectedOrdersPerCustomer?: number;
  repurchaseRatePerPeriod?: number;
  analysisHorizonPeriods?: number;
};

export type EcommerceSubscriptionReplenishmentInput = EcommerceOfferInputBase & {
  offerType: "ecommerce_subscription_replenishment";
  averageOrderValue: number;
  ordersPerSubscriberPerPeriod?: number;
  grossProfitPerSubscriberPerPeriod?: number;
  grossMargin?: number;
  refundsRatePerPeriod?: number;
  activeCustomersStart: number;
  retentionInputMode?: RetentionInputMode;
  directChurnRatePerPeriod?: number;
  churnedCustomersPerPeriod?: number;
  retainedCustomersFromStartAtEnd?: number;
};

export type SoftwarePaidPilotInput = SoftwareOfferInputBase & {
  offerType: "software_paid_pilot";
  pilotFeePerNewCustomer: number;
  pilotDeliveryCostPerNewCustomer?: number;
  pilotGrossMargin?: number;
};

export type SoftwareTokenPricingInput = SoftwareOfferInputBase & {
  offerType: "software_token_pricing";
  activeCustomersStart: number;
  retentionInputMode?: RetentionInputMode;
  directChurnRatePerPeriod?: number;
  churnedCustomersPerPeriod?: number;
  retainedCustomersFromStartAtEnd?: number;
  usageUnitsPerCustomerPerPeriod: number;
  pricePerUsageUnit: number;
  costPerUsageUnit: number;
  fixedDeliveryCostPerPeriod?: number;
};

export type SoftwareHybridPlatformUsageInput = SoftwareOfferInputBase & {
  offerType: "software_hybrid_platform_usage";
  activeCustomersStart: number;
  retentionInputMode?: RetentionInputMode;
  directChurnRatePerPeriod?: number;
  churnedCustomersPerPeriod?: number;
  retainedCustomersFromStartAtEnd?: number;
  platformFeePerCustomerPerPeriod: number;
  usageUnitsPerCustomerPerPeriod: number;
  pricePerUsageUnit: number;
  platformDeliveryCostPerCustomerPerPeriod?: number;
  costPerUsageUnit?: number;
  fixedDeliveryCostPerPeriod?: number;
};

export type SoftwareImplementationPlusSubscriptionInput = SoftwareOfferInputBase & {
  offerType: "software_implementation_plus_subscription";
  activeCustomersStart: number;
  retentionInputMode?: RetentionInputMode;
  directChurnRatePerPeriod?: number;
  churnedCustomersPerPeriod?: number;
  retainedCustomersFromStartAtEnd?: number;
  directArpc: number;
  grossProfitInputMode?: GrossProfitInputMode;
  grossMargin?: number;
  deliveryCostPerCustomerPerPeriod?: number;
  fixedDeliveryCostPerPeriod?: number;
  implementationFeePerNewCustomer: number;
  implementationDeliveryCostPerNewCustomer?: number;
  implementationGrossMargin?: number;
};

export type UnsupportedSoftwareTechOfferInput = {
  offerId: string;
  offerName: string;
  offerType: Exclude<
    SoftwareTechOfferType,
    | "software_subscription"
    | "software_paid_pilot"
    | "software_token_pricing"
    | "software_hybrid_platform_usage"
    | "software_implementation_plus_subscription"
  >;
  analysisPeriod: KpiPeriod;
  softwareConfig: SoftwareTechConfig;
};

export type UnsupportedEcommerceOfferInput = {
  offerId: string;
  offerName: string;
  offerType: Exclude<
    EcommerceOfferType,
    | "ecommerce_one_time_product"
    | "ecommerce_repeat_purchase_product"
    | "ecommerce_subscription_replenishment"
  >;
  analysisPeriod: KpiPeriod;
  ecommerceConfig: EcommerceConfig;
};

export type OfferInput =
  | SubscriptionOfferInput
  | SoftwarePaidPilotInput
  | SoftwareTokenPricingInput
  | SoftwareHybridPlatformUsageInput
  | SoftwareImplementationPlusSubscriptionInput
  | EcommerceOneTimeProductInput
  | EcommerceRepeatPurchaseProductInput
  | EcommerceSubscriptionReplenishmentInput
  | UnsupportedEcommerceOfferInput
  | UnsupportedSoftwareTechOfferInput;
export type AnyKpiInput = KPIInput | OfferInput;

export type KPIResult = {
  cac: number | null;
  arpc: number | null;
  churnRate: number | null;
  retentionRate: number | null;
  ltv: number | null;
  ltgpPerCustomer: number | null;
  ltgpToCacRatio: number | null;
  cacPaybackPeriods: number | null;
  hypotheticalMaxCustomers: number | null;
  hypotheticalMaxRevenuePerYear: number | null;
  hypotheticalMaxProfitPerYear: number | null;
  projectedRevenueNextYear: number | null;
  projectedProfitNextYear: number | null;
  car: number | null;
};

export type KpiEvaluation<TInput extends AnyKpiInput = AnyKpiInput> = {
  inputs: TInput;
  results: KPIResult;
  offerResults: KPIResult;
  warnings: string[];
  calculationVersion: CalculationVersion;
  assumptionsApplied: string[];
};
