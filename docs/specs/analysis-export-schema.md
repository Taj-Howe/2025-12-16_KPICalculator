# Analysis and Export Schema Spec

## Objective

Define a deterministic analysis layer that sits on top of the existing KPI engine and produces:

- baseline snapshots
- lever scenarios
- sensitivity analysis
- ranked opportunities
- structured exports
- a clean contract for a future AI summary layer

This spec is intentionally conservative:

- do not change the current KPI math
- do not change the public `KPIResult` shape
- do not require database or API changes in the spec phase
- keep AI downstream of deterministic analysis

## Scope

This spec covers:

- baseline input/output snapshot structure
- scenario and sensitivity request/response structure
- percent-change and absolute-change lever formats
- KPI delta format
- opportunity ranking format
- export schema for CSV, API, and report use
- future AI summary input/output contract

This spec does not cover:

- AI provider integration
- visualization design
- external payments/accounting connectors
- database persistence changes

## Design Principles

1. The analysis layer must use the exact same evaluation path as the calculator.
2. Every scenario must be reproducible from a baseline input plus an explicit patch.
3. Ranking must be deterministic and transparent.
4. AI may summarize scenarios, but it must not generate math.
5. Exports must be comprehensive enough to support CSV, API, and report workflows without needing hidden reconstruction logic.

## Current KPI Contract

The analysis layer is anchored to the existing evaluation contract:

```ts
type KpiEvaluation = {
  inputs: AnyKpiInput;
  results: KPIResult;
  offerResults: KPIResult;
  warnings: string[];
  calculationVersion: CalculationVersion;
  assumptionsApplied: string[];
};

type KPIResult = {
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
```

The analysis layer must never compute metrics independently. It must generate candidate inputs, run `evaluateKpis`, then compare the resulting `KPIResult` to baseline.

## Supported Analysis Inputs

The first analysis release should support current executable software offer types only:

- `software_subscription`
- `software_paid_pilot`
- `software_token_pricing`
- `software_hybrid_platform_usage`
- `software_implementation_plus_subscription`

Legacy `businessModel` payloads may be analyzed later, but they are not the target for the first version.

## Analysis Concepts

### Baseline Snapshot

A baseline snapshot is the exact offer input and evaluation state used as the reference point for all scenario comparisons.

### Lever Scenario

A lever scenario is one explicit modification to one business lever, such as:

- lower churn
- lower CAC
- increase sales velocity
- improve gross margin
- increase price / ARPC

### Sensitivity Sweep

A sensitivity sweep is multiple ordered scenarios across the same lever, such as:

- churn: `-5%`, `-10%`, `-15%`
- price: `+5%`, `+10%`, `+15%`

### Opportunity Ranking

An opportunity ranking is the ordered list of lever scenarios sorted by a chosen optimization target, usually projected profit upside.

## Analysis Targets

The first implementation should support these optimization targets:

- `projected_profit_next_year`
- `hypothetical_max_profit_per_year`
- `ltgp_to_cac_ratio`
- `cac_payback_periods`

Default ranking target:

- `projected_profit_next_year`

Default tie-breakers:

1. larger absolute upside in target metric
2. larger percent upside in target metric
3. lower implementation effort score if defined

## Levers

The first release should support these deterministic levers:

- `sales_velocity`
- `cac`
- `churn`
- `gross_margin`
- `price`

### Lever-to-field mapping

The engine must not mutate arbitrary fields. Each lever maps to specific input fields by offer type.

#### `sales_velocity`

Maps to:

- `newCustomersPerPeriod`

Applies to:

- all supported software offers

#### `cac`

Preferred mapping:

- if `cacInputMode === "direct"` -> `directCac`
- else if `cacInputMode === "derived"` -> derive equivalent spend change by holding `newCustomersPerPeriod` constant and changing `marketingSpendPerPeriod`

Applies to:

- all supported software offers

#### `churn`

Preferred mapping for recurring offers:

- if `retentionInputMode === "rate"` -> `directChurnRatePerPeriod`
- else if count-based retention is used -> synthesize a count-based patch using the baseline `activeCustomersStart` and desired churn rate

Applies to:

- `software_subscription`
- `software_token_pricing`
- `software_hybrid_platform_usage`
- `software_implementation_plus_subscription`

Does not apply to:

- `software_paid_pilot`

#### `gross_margin`

Preferred mapping:

- if margin-based mode exists, mutate the relevant margin field
- if cost-based mode exists, this lever is unavailable unless a margin-based conversion rule is explicitly implemented

Applies to:

- `software_subscription`
- `software_paid_pilot`
- `software_implementation_plus_subscription`

Not part of first-release lever support for:

- `software_token_pricing`
- `software_hybrid_platform_usage`

Reason:

- those offers are cost-composition models, not single-margin models

#### `price`

Preferred mapping:

- `software_subscription` -> `directArpc` if direct ARPC mode is used; otherwise mutate `revenuePerPeriod` only if explicitly supported later
- `software_paid_pilot` -> `pilotFeePerNewCustomer`
- `software_token_pricing` -> `pricePerUsageUnit`
- `software_hybrid_platform_usage` -> either:
  - `platformFeePerCustomerPerPeriod`
  - or `pricePerUsageUnit`
  - first release should treat these as separate price levers:
    - `platform_price`
    - `usage_price`
- `software_implementation_plus_subscription` -> either:
  - `directArpc` for recurring price
  - `implementationFeePerNewCustomer` for implementation price
  - first release should treat these as separate price levers:
    - `subscription_price`
    - `implementation_price`

## Scenario Patch Modes

Each scenario must declare how a lever changes:

```ts
type ScenarioChangeMode = "absolute" | "percent";
```

### Absolute change

Examples:

- `newCustomersPerPeriod + 5`
- `directCac - 250`
- `directChurnRatePerPeriod - 0.02`

### Percent change

Examples:

- `price +10%`
- `cac -15%`
- `grossMargin +5%` relative to baseline value, not percentage points

Implementation rule:

- percent changes operate multiplicatively on the baseline value
- absolute changes operate additively on the baseline value

## Guardrails

Scenarios must respect the same validation limits as the core schema.

Required clamping rules:

- no negative numeric values unless the base schema already allows them
- churn must stay between `0` and `1`
- gross margin must stay between `0` and `1`
- retained customers cannot exceed starting customers
- derived churn count cannot exceed starting customers

If a requested scenario patch cannot be represented safely, the analysis engine must mark the scenario as invalid rather than silently mutating unrelated fields.

## Baseline Snapshot Schema

```ts
type AnalysisBaselineSnapshot = {
  generatedAt: string; // ISO timestamp
  offerType: OfferInput["offerType"];
  offerId: string;
  offerName: string;
  analysisPeriod: KpiPeriod;
  calculationVersion: CalculationVersion;
  inputs: OfferInput;
  results: KPIResult;
  warnings: string[];
  assumptionsApplied: string[];
};
```

## Scenario Definition Schema

```ts
type AnalysisLever =
  | "sales_velocity"
  | "cac"
  | "churn"
  | "gross_margin"
  | "price"
  | "platform_price"
  | "usage_price"
  | "subscription_price"
  | "implementation_price";

type ScenarioDefinition = {
  id: string;
  lever: AnalysisLever;
  label: string;
  mode: "absolute" | "percent";
  amount: number;
  direction: "increase" | "decrease";
  fieldPath: string;
  baselineValue: number | null;
  scenarioValue: number | null;
  rationale: string;
};
```

`fieldPath` is the canonical mutated input field, such as:

- `newCustomersPerPeriod`
- `directCac`
- `marketingSpendPerPeriod`
- `directChurnRatePerPeriod`
- `grossMargin`
- `pilotFeePerNewCustomer`
- `pricePerUsageUnit`

## KPI Delta Schema

Each scenario must include metric deltas against the baseline.

```ts
type KpiMetricKey = keyof KPIResult;

type MetricDelta = {
  metric: KpiMetricKey;
  baseline: number | null;
  scenario: number | null;
  absoluteDelta: number | null;
  percentDelta: number | null;
};
```

Delta rules:

- if either side is `null`, `absoluteDelta` and `percentDelta` are `null`
- `absoluteDelta = scenario - baseline`
- `percentDelta = baseline === 0 || baseline == null ? null : (scenario - baseline) / baseline`

For metrics where lower is better, like `cacPaybackPeriods`, the delta remains mathematically consistent. Interpretation is handled at the ranking layer.

## Scenario Evaluation Schema

```ts
type ScenarioEvaluation = {
  scenario: ScenarioDefinition;
  valid: boolean;
  invalidReason?: string;
  inputs: OfferInput | null;
  results: KPIResult | null;
  warnings: string[];
  assumptionsApplied: string[];
  metricDeltas: MetricDelta[];
  primaryOutcome: {
    metric: KpiMetricKey;
    baseline: number | null;
    scenario: number | null;
    absoluteDelta: number | null;
    percentDelta: number | null;
  };
};
```

## Sensitivity Sweep Schema

```ts
type SensitivitySweep = {
  lever: AnalysisLever;
  targetMetric: KpiMetricKey;
  mode: "absolute" | "percent";
  steps: number[];
  scenarios: ScenarioEvaluation[];
};
```

Example:

```ts
{
  lever: "churn",
  targetMetric: "projectedProfitNextYear",
  mode: "percent",
  steps: [-0.05, -0.10, -0.15],
}
```

## Ranked Opportunity Schema

```ts
type OpportunityScore = {
  targetMetric: KpiMetricKey;
  baseline: number | null;
  scenario: number | null;
  absoluteDelta: number | null;
  percentDelta: number | null;
  betterDirection: "higher" | "lower";
  normalizedScore: number | null;
};

type RankedOpportunity = {
  rank: number;
  scenarioId: string;
  lever: AnalysisLever;
  label: string;
  summary: string;
  scenario: ScenarioDefinition;
  score: OpportunityScore;
  keyDeltas: MetricDelta[];
  warnings: string[];
  confidence: "high" | "medium" | "low";
};
```

### Ranking rules

Default better-direction by metric:

- `projectedProfitNextYear` -> `higher`
- `hypotheticalMaxProfitPerYear` -> `higher`
- `ltgpToCacRatio` -> `higher`
- `cacPaybackPeriods` -> `lower`

Default normalized score:

- if better-direction is `higher`: use percent delta if available, else absolute delta
- if better-direction is `lower`: invert the sign of the percent or absolute delta so lower values score higher

Confidence rule for first implementation:

- `high`: direct-input lever, valid scenario, no warnings
- `medium`: valid scenario with warnings or synthesized count conversion
- `low`: valid scenario with multiple assumptions or weak baseline completeness

## Analysis Report Schema

```ts
type AnalysisReport = {
  version: "analysis-v1";
  baseline: AnalysisBaselineSnapshot;
  targetMetric: KpiMetricKey;
  generatedScenarios: ScenarioEvaluation[];
  sweeps: SensitivitySweep[];
  rankedOpportunities: RankedOpportunity[];
  bestOpportunity: RankedOpportunity | null;
};
```

## Export Schema

Exports must support three use cases:

- CSV download
- API payload
- saved report attachment or offline analysis

### Canonical JSON export

```ts
type AnalysisExport = {
  version: "analysis-export-v1";
  baseline: AnalysisBaselineSnapshot;
  report: AnalysisReport;
  exportMetadata: {
    exportedAt: string;
    exportSource: "ui" | "api" | "report";
    schemaVersion: "analysis-export-v1";
  };
};
```

### Flat row export

For CSV-like use, every scenario should also be representable as a flat row.

```ts
type AnalysisScenarioRow = {
  baselineOfferId: string;
  baselineOfferName: string;
  baselineOfferType: string;
  analysisPeriod: string;
  calculationVersion: string;

  targetMetric: string;
  scenarioId: string;
  lever: string;
  label: string;
  mode: string;
  direction: string;
  amount: number;
  fieldPath: string;
  baselineValue: number | null;
  scenarioValue: number | null;
  valid: boolean;
  invalidReason: string | null;

  baseline_cac: number | null;
  scenario_cac: number | null;
  delta_cac_absolute: number | null;
  delta_cac_percent: number | null;

  baseline_arpc: number | null;
  scenario_arpc: number | null;
  delta_arpc_absolute: number | null;
  delta_arpc_percent: number | null;

  baseline_churnRate: number | null;
  scenario_churnRate: number | null;
  delta_churnRate_absolute: number | null;
  delta_churnRate_percent: number | null;

  baseline_retentionRate: number | null;
  scenario_retentionRate: number | null;
  delta_retentionRate_absolute: number | null;
  delta_retentionRate_percent: number | null;

  baseline_ltv: number | null;
  scenario_ltv: number | null;
  delta_ltv_absolute: number | null;
  delta_ltv_percent: number | null;

  baseline_ltgpPerCustomer: number | null;
  scenario_ltgpPerCustomer: number | null;
  delta_ltgpPerCustomer_absolute: number | null;
  delta_ltgpPerCustomer_percent: number | null;

  baseline_ltgpToCacRatio: number | null;
  scenario_ltgpToCacRatio: number | null;
  delta_ltgpToCacRatio_absolute: number | null;
  delta_ltgpToCacRatio_percent: number | null;

  baseline_cacPaybackPeriods: number | null;
  scenario_cacPaybackPeriods: number | null;
  delta_cacPaybackPeriods_absolute: number | null;
  delta_cacPaybackPeriods_percent: number | null;

  baseline_hypotheticalMaxCustomers: number | null;
  scenario_hypotheticalMaxCustomers: number | null;
  delta_hypotheticalMaxCustomers_absolute: number | null;
  delta_hypotheticalMaxCustomers_percent: number | null;

  baseline_hypotheticalMaxRevenuePerYear: number | null;
  scenario_hypotheticalMaxRevenuePerYear: number | null;
  delta_hypotheticalMaxRevenuePerYear_absolute: number | null;
  delta_hypotheticalMaxRevenuePerYear_percent: number | null;

  baseline_hypotheticalMaxProfitPerYear: number | null;
  scenario_hypotheticalMaxProfitPerYear: number | null;
  delta_hypotheticalMaxProfitPerYear_absolute: number | null;
  delta_hypotheticalMaxProfitPerYear_percent: number | null;

  baseline_projectedRevenueNextYear: number | null;
  scenario_projectedRevenueNextYear: number | null;
  delta_projectedRevenueNextYear_absolute: number | null;
  delta_projectedRevenueNextYear_percent: number | null;

  baseline_projectedProfitNextYear: number | null;
  scenario_projectedProfitNextYear: number | null;
  delta_projectedProfitNextYear_absolute: number | null;
  delta_projectedProfitNextYear_percent: number | null;

  baseline_car: number | null;
  scenario_car: number | null;
  delta_car_absolute: number | null;
  delta_car_percent: number | null;

  rank: number | null;
  score: number | null;
  confidence: string | null;
  warnings: string;
  assumptionsApplied: string;
};
```

### Export minimums

Every export must include:

- baseline inputs
- baseline results
- every scenario definition
- scenario validity state
- scenario metric deltas
- ranking output
- warnings
- assumptions

## AI Summary Contract

The AI layer must consume deterministic analysis outputs, not raw user prompts alone.

### AI input

```ts
type AiOpportunitySummaryInput = {
  baseline: AnalysisBaselineSnapshot;
  targetMetric: KpiMetricKey;
  bestOpportunity: RankedOpportunity | null;
  topOpportunities: RankedOpportunity[];
  generatedScenarios: ScenarioEvaluation[];
};
```

### AI output

```ts
type AiOpportunitySummaryOutput = {
  version: "ai-opportunity-summary-v1";
  headline: string;
  recommendation: string;
  recommendedLever: AnalysisLever | null;
  recommendedScenarioId: string | null;
  whyItWon: string[];
  expectedImpact: {
    targetMetric: KpiMetricKey | null;
    baseline: number | null;
    scenario: number | null;
    absoluteDelta: number | null;
    percentDelta: number | null;
  } | null;
  caveats: string[];
  basedOnWarnings: string[];
};
```

### AI rules

- AI must not invent a winning scenario that is not in `rankedOpportunities`.
- AI must not invent metric values.
- AI must surface warnings and caveats if the top-ranked opportunity is based on weak assumptions.
- If no valid opportunities exist, AI must return a null recommendation with a reason.
- First implementation rule: the provider may rewrite narrative fields only. The chosen scenario, lever, and expected impact must stay bound to the deterministic top-ranked opportunity.

## First Implementation Boundaries

The first implementation should be intentionally narrow:

1. Support current executable software offers only.
2. Support one baseline snapshot at a time.
3. Support predefined lever sweeps for:
   - `sales_velocity`
   - `cac`
   - `churn`
   - `gross_margin`
   - `price`
4. Support JSON export first.
5. Generate flat-row export data in memory even if CSV download UI comes later.
6. Add AI only after deterministic ranking is complete.

## Recommended Implementation Order

1. Add analysis types and a pure `analysis` module.
2. Implement baseline snapshot creation from an existing `KpiEvaluation`.
3. Implement lever-to-field patch generation by offer type.
4. Implement deterministic scenario evaluation and KPI delta generation.
5. Implement opportunity ranking.
6. Implement canonical JSON export and flat scenario rows.
7. Add AI summary generation on top of ranked deterministic outputs.

## Verification Requirements

The future implementation must prove:

- baseline snapshot equals the current calculator output
- every supported lever produces expected field patches
- invalid scenarios are rejected explicitly
- metric deltas are correct for null and non-null cases
- ranking order is deterministic
- exports are structurally complete and versioned
- AI summary never contradicts deterministic analysis
