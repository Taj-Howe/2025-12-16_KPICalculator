import type {
  KPIResult,
  KpiPeriod,
  OfferInput,
  SoftwareHybridPlatformUsageInput,
  SoftwareImplementationPlusSubscriptionInput,
  SoftwarePaidPilotInput,
  SoftwareTokenPricingInput,
  SubscriptionOfferInput,
} from "@/features/kpi/types";
import type { ReportSummary } from "@/components/report-comparison";
import type { NormalizedOfferPeriodSnapshot } from "@/features/integrations/types";

export type SupportedSoftwareOfferInput =
  | SubscriptionOfferInput
  | SoftwarePaidPilotInput
  | SoftwareTokenPricingInput
  | SoftwareHybridPlatformUsageInput
  | SoftwareImplementationPlusSubscriptionInput;

export type SupportedSoftwareOfferType = SupportedSoftwareOfferInput["offerType"];
export type KPIInputState = SupportedSoftwareOfferInput;
export type KPIResults = KPIResult;

export type ReportSeries = {
  period: KpiPeriod;
  labels: string[];
  customersStart: (number | null)[];
  newCustomers: (number | null)[];
  churnRate: (number | null)[];
  retentionRate: (number | null)[];
  cac: (number | null)[];
  arpc: (number | null)[];
  ltgpPerCustomer: (number | null)[];
  ltgpToCacRatio: (number | null)[];
  cacPaybackPeriods: (number | null)[];
  hypotheticalMaxCustomers: (number | null)[];
  hypotheticalMaxRevenuePerYear: (number | null)[];
  hypotheticalMaxProfitPerYear: (number | null)[];
  projectedRevenueNextYear: (number | null)[];
  projectedProfitNextYear: (number | null)[];
};

export type AppHeaderProps = {
  hero: string;
  sidekick: string;
  description: string;
  sessionEmail: string | null;
  onSignIn?: () => void;
  onSignOut: () => void;
  signInCta?: React.ReactNode;
};

export type KpiInputPanelProps = {
  value: KPIInputState;
  onChange: (next: KPIInputState) => void;
  onCalculate: () => Promise<boolean>;
  isCalculating: boolean;
};

export type SampleDataControlsProps = {
  onLoadSample: () => void;
  onClear: () => void;
};

export type ReportsPanelProps = {
  isSignedIn: boolean;
  reports: ReportSummary[];
  selectedReport: ReportSummary | null;
  onSelectReport: (id: number) => void;
  onRefresh: () => Promise<void>;
  series?: ReportSeries | null;
  importedSnapshots?: NormalizedOfferPeriodSnapshot[];
  snapshotsError?: string | null;
  reportsError?: string | null;
  seriesError?: string | null;
  signInCta?: React.ReactNode;
  onSeedSampleYear: () => void;
  onSeedSampleStripeImport: () => void;
  isSeeding: boolean;
  isSeedingImportedData: boolean;
  seedStatus: string | null;
  importedSeedStatus: string | null;
  onDeleteReport: (id: number) => void;
};

export type SoftwareOfferPickerOption = {
  value: SupportedSoftwareOfferType | Exclude<
    OfferInput["offerType"],
    SupportedSoftwareOfferType | "subscription"
  >;
  label: string;
  summary: string;
  status: "supported" | "staged";
};

export type IndustryPickerOption = {
  value: "software_tech" | "ecommerce" | "online_education" | "services";
  label: string;
  status: "available" | "staged";
};

export const industryPickerOptions: IndustryPickerOption[] = [
  {
    value: "software_tech",
    label: "Software / Tech",
    status: "available",
  },
  {
    value: "ecommerce",
    label: "E-commerce",
    status: "staged",
  },
  {
    value: "online_education",
    label: "Online Education",
    status: "staged",
  },
  {
    value: "services",
    label: "Service Businesses",
    status: "staged",
  },
];

export const softwareOfferPickerOptions: SoftwareOfferPickerOption[] = [
  {
    value: "software_subscription",
    label: "Software Subscription",
    summary: "Recurring subscription revenue with churn, CAC, and gross profit.",
    status: "supported",
  },
  {
    value: "software_paid_pilot",
    label: "Paid Pilot",
    summary: "One-time pilot fee with acquisition economics and annual throughput.",
    status: "supported",
  },
  {
    value: "software_token_pricing",
    label: "Token Pricing",
    summary: "Recurring customers monetized by token or usage-unit consumption.",
    status: "supported",
  },
  {
    value: "software_hybrid_platform_usage",
    label: "Platform + Usage",
    summary: "Base platform fee plus ongoing usage revenue per active customer.",
    status: "supported",
  },
  {
    value: "software_implementation_plus_subscription",
    label: "Implementation + Subscription",
    summary: "Upfront implementation fee plus recurring subscription economics.",
    status: "supported",
  },
  {
    value: "software_pilot_to_subscription",
    label: "Pilot to Subscription",
    summary: "Staged next: paid pilot that converts into recurring subscription value.",
    status: "staged",
  },
  {
    value: "software_token_plus_platform",
    label: "Token + Platform Fee",
    summary: "Staged next: token usage plus a fixed platform subscription layer.",
    status: "staged",
  },
  {
    value: "software_transaction_fee",
    label: "Transaction Fee",
    summary: "Staged next: recurring transaction-fee economics on processed volume.",
    status: "staged",
  },
];

const defaultSubscriptionInput: SubscriptionOfferInput = {
  offerId: "main-offer",
  offerName: "Main Software Offer",
  offerType: "software_subscription",
  analysisPeriod: "monthly",
  calculatorMode: "business_metrics",
  revenueInputMode: "total_revenue",
  grossProfitInputMode: "margin",
  cacInputMode: "derived",
  retentionInputMode: "counts",
  revenuePerPeriod: 100000,
  grossMargin: 0.7,
  marketingSpendPerPeriod: 20000,
  newCustomersPerPeriod: 20,
  activeCustomersStart: 100,
  retainedCustomersFromStartAtEnd: 90,
  softwareConfig: {
    industryPreset: "software_tech",
    monetizationModel: "subscription_seat_based",
    revenueComponents: [
      {
        componentType: "platform_subscription",
        label: "Core platform subscription",
        pricingMetric: "workspace",
      },
      {
        componentType: "seat_subscription",
        label: "Per-seat subscription",
        pricingMetric: "seat",
      },
    ],
    goToMarketMotion: "sales_led",
  },
};

const defaultPaidPilotInput: SoftwarePaidPilotInput = {
  offerId: "pilot-offer",
  offerName: "Enterprise Pilot",
  offerType: "software_paid_pilot",
  analysisPeriod: "monthly",
  newCustomersPerPeriod: 4,
  cacInputMode: "derived",
  marketingSpendPerPeriod: 8000,
  pilotFeePerNewCustomer: 12000,
  pilotGrossMargin: 0.75,
  softwareConfig: {
    industryPreset: "software_tech",
    monetizationModel: "paid_pilot",
    revenueComponents: [{ componentType: "pilot_fee", label: "Pilot fee" }],
    goToMarketMotion: "enterprise",
  },
};

const defaultTokenPricingInput: SoftwareTokenPricingInput = {
  offerId: "token-offer",
  offerName: "Token Offer",
  offerType: "software_token_pricing",
  analysisPeriod: "monthly",
  newCustomersPerPeriod: 5,
  cacInputMode: "derived",
  marketingSpendPerPeriod: 10000,
  activeCustomersStart: 40,
  retentionInputMode: "counts",
  retainedCustomersFromStartAtEnd: 36,
  usageUnitsPerCustomerPerPeriod: 2,
  pricePerUsageUnit: 1200,
  costPerUsageUnit: 300,
  softwareConfig: {
    industryPreset: "software_tech",
    monetizationModel: "token_pricing",
    revenueComponents: [
      { componentType: "token_usage", label: "Token usage", tokenUnit: "1m_tokens" },
    ],
    goToMarketMotion: "product_led",
  },
};

const defaultHybridInput: SoftwareHybridPlatformUsageInput = {
  offerId: "hybrid-offer",
  offerName: "Platform + Usage Offer",
  offerType: "software_hybrid_platform_usage",
  analysisPeriod: "monthly",
  newCustomersPerPeriod: 6,
  cacInputMode: "derived",
  marketingSpendPerPeriod: 9000,
  activeCustomersStart: 50,
  retentionInputMode: "counts",
  retainedCustomersFromStartAtEnd: 45,
  platformFeePerCustomerPerPeriod: 500,
  usageUnitsPerCustomerPerPeriod: 100,
  pricePerUsageUnit: 4,
  platformDeliveryCostPerCustomerPerPeriod: 100,
  costPerUsageUnit: 1.5,
  softwareConfig: {
    industryPreset: "software_tech",
    monetizationModel: "subscription_hybrid",
    revenueComponents: [
      {
        componentType: "platform_subscription",
        label: "Platform fee",
        pricingMetric: "workspace",
      },
      {
        componentType: "usage_metered",
        label: "Usage",
        unitName: "tasks",
      },
    ],
    goToMarketMotion: "product_led",
  },
};

const defaultImplementationInput: SoftwareImplementationPlusSubscriptionInput = {
  offerId: "implementation-offer",
  offerName: "Implementation + Subscription",
  offerType: "software_implementation_plus_subscription",
  analysisPeriod: "monthly",
  newCustomersPerPeriod: 3,
  cacInputMode: "derived",
  marketingSpendPerPeriod: 9000,
  activeCustomersStart: 30,
  retentionInputMode: "counts",
  retainedCustomersFromStartAtEnd: 27,
  directArpc: 2000,
  grossProfitInputMode: "margin",
  grossMargin: 0.8,
  implementationFeePerNewCustomer: 15000,
  implementationGrossMargin: 0.6,
  softwareConfig: {
    industryPreset: "software_tech",
    monetizationModel: "implementation_plus_subscription",
    revenueComponents: [
      { componentType: "implementation_fee", label: "Implementation fee" },
      {
        componentType: "platform_subscription",
        label: "Platform subscription",
        pricingMetric: "workspace",
      },
    ],
    goToMarketMotion: "sales_led",
  },
};

export const createDefaultOfferInput = (
  offerType: SupportedSoftwareOfferType,
): SupportedSoftwareOfferInput => {
  switch (offerType) {
    case "software_subscription":
      return structuredClone(defaultSubscriptionInput);
    case "software_paid_pilot":
      return structuredClone(defaultPaidPilotInput);
    case "software_token_pricing":
      return structuredClone(defaultTokenPricingInput);
    case "software_hybrid_platform_usage":
      return structuredClone(defaultHybridInput);
    case "software_implementation_plus_subscription":
      return structuredClone(defaultImplementationInput);
    default:
      return structuredClone(defaultSubscriptionInput);
  }
};

export const sampleKpiInput: KPIInputState =
  createDefaultOfferInput("software_subscription");
