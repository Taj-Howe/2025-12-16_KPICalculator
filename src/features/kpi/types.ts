export type KpiPeriod = "monthly" | "quarterly" | "yearly";

export type BusinessModel = "subscription" | "transactional" | "hybrid";

export type KPIInput = {
  period: KpiPeriod;
  businessModel: BusinessModel;
  revenuePerPeriod: number;
  grossMargin: number;
  marketingSpendPerPeriod: number;
  newCustomersPerPeriod: number;
  activeCustomersStart: number;
  activeCustomersEnd: number;
  churnedCustomersPerPeriod?: number;
  retentionRatePerPeriod?: number;
};

export type KPIResult = {
  cac: number | null;
  arpc: number | null;
  churnRate: number | null;
  ltv: number | null;
  ltgpPerCustomer: number | null;
  ltgpToCacRatio: number | null;
  growthAssessment: number | null;
  hypotheticalMaxRevenuePerYear: number | null;
  hypotheticalMaxProfitPerYear: number | null;
  car: number | null;
};
