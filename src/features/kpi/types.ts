export type KpiPeriod = "monthly" | "quarterly" | "yearly";

export type BusinessModel = "subscription" | "transactional" | "hybrid";
export type OfferType =
  | "subscription"
  | "one_time"
  | "installment"
  | "usage_based"
  | "service_retainer";

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
  offerType: "subscription";
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
};

export type OfferInput = SubscriptionOfferInput;
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
