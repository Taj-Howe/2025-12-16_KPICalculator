import type { KPIInput, KPIResult, KpiPeriod } from "@/features/kpi/types";
import type { ReportSummary } from "@/components/report-comparison";

export type KPIInputState = KPIInput;
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
  maxRevenuePerYear: (number | null)[];
  maxProfitPerYear: (number | null)[];
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
  onCalculate: () => Promise<void>;
  isCalculating: boolean;
  results: KPIResults | null;
  warnings: string[];
  children?: React.ReactNode;
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
  signInCta?: React.ReactNode;
  onSeedSampleYear: () => void;
  isSeeding: boolean;
  seedStatus: string | null;
  onDeleteReport: (id: number) => void;
};

export const sampleKpiInput: KPIInputState = {
  period: "monthly",
  businessModel: "subscription",
  revenuePerPeriod: 120000,
  grossMargin: 0.72,
  marketingSpendPerPeriod: 24000,
  newCustomersPerPeriod: 30,
  activeCustomersStart: 150,
  retainedCustomersFromStartAtEnd: 130,
  retentionRatePerPeriod: 0.65,
};
