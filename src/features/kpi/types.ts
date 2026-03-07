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

export type OfferType = LegacyOfferType | SoftwareTechOfferType;

export type CalculationVersion =
  | "kpi-v1-legacy-model"
  | "kpi-v2-subscription-offer";

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
  revenuePerPeriod: number;
  grossMargin: number;
  marketingSpendPerPeriod: number;
  newCustomersPerPeriod: number;
  activeCustomersStart: number;
  churnedCustomersPerPeriod?: number;
  retainedCustomersFromStartAtEnd?: number;
  softwareConfig?: SoftwareTechConfig;
};

export type UnsupportedSoftwareTechOfferInput = {
  offerId: string;
  offerName: string;
  offerType: Exclude<SoftwareTechOfferType, "software_subscription">;
  analysisPeriod: KpiPeriod;
  softwareConfig: SoftwareTechConfig;
};

export type OfferInput =
  | SubscriptionOfferInput
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
  hypotheticalMaxRevenuePerYear: number | null;
  hypotheticalMaxProfitPerYear: number | null;
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
