# Software/Tech Monetization Engine Spec

## Objective

Define a shared internal monetization engine for software/tech offers so the KPI calculator can support additional monetization models without duplicating evaluation logic.

This spec is intentionally conservative:
- keep current `software_subscription` behavior unchanged
- do not change the public `KPIResult` shape
- do not require API or database changes for this phase
- prefer a normalized internal model over branching every formula directly on `offerType`

Target staged offer types:
- `software_paid_pilot`
- `software_token_pricing`
- `software_hybrid_platform_usage`
- `software_implementation_plus_subscription`

## Current Invariants

The current executable software/tech path is:
- `software_subscription`

That path already supports:
- direct or derived CAC
- direct ARPC or total revenue
- gross margin or delivery-cost inputs
- count-based or rate-based churn
- next-year projection and steady-state ceiling

This behavior is locked and must not drift while adding new software/tech models.

## Problem

The current engine assumes one recurring subscription shape:
- one main ARPC stream
- one main gross-profit-per-customer stream
- one customer churn mechanic

That is enough for `software_subscription`, but not enough for:
- pilots that are paid once and do not recur
- token-priced offers where ARPC is derived from usage economics
- hybrid offers that combine platform fees with usage fees
- implementation-plus-subscription offers that blend upfront and recurring economics

If each new model is added as ad hoc conditionals in the evaluator, the KPI layer will become brittle and hard to verify.

## Proposed Internal Shape

Introduce a normalized internal economics model that separates:
- acquisition
- recurring revenue/profit
- one-time revenue/profit
- retention model
- forecast mode

### Proposed internal types

```ts
export type NormalizedAcquisitionModel = {
  newCustomersPerPeriod: number;
  cacPerNewCustomer: number | null;
  acquisitionSpendPerPeriod: number;
};

export type NormalizedRecurringModel = {
  activeCustomersStart: number | null;
  arpcPerActiveCustomerPerPeriod: number | null;
  grossProfitPerActiveCustomerPerPeriod: number | null;
  churnRatePerPeriod: number | null;
  retentionRatePerPeriod: number | null;
};

export type NormalizedOneTimeModel = {
  revenuePerNewCustomer: number | null;
  grossProfitPerNewCustomer: number | null;
};

export type NormalizedForecastMode =
  | "recurring"
  | "throughput"
  | "mixed";

export type NormalizedSoftwareEconomics = {
  offerType:
    | "software_subscription"
    | "software_paid_pilot"
    | "software_token_pricing"
    | "software_hybrid_platform_usage"
    | "software_implementation_plus_subscription";
  analysisPeriod: KpiPeriod;
  acquisition: NormalizedAcquisitionModel;
  recurring: NormalizedRecurringModel | null;
  oneTime: NormalizedOneTimeModel | null;
  forecastMode: NormalizedForecastMode;
  assumptionsApplied: string[];
  warnings: string[];
};
```

## Design Rule

Each supported software/tech offer type must first normalize itself into `NormalizedSoftwareEconomics`.

Then a shared evaluator can compute:
- CAC
- ARPC
- LTV
- LTGP per customer
- LTGP:CAC
- CAC payback
- hypothetical max customers
- hypothetical max revenue/year
- hypothetical max profit/year
- projected revenue/profit next year

This keeps offer-specific logic isolated in normalization and keeps the KPI math path explicit.

## Shared Inputs vs Offer-Specific Inputs

### Shared inputs across all future software/tech offers

These should exist in a common base input type for software/tech offers:

```ts
export type SoftwareOfferInputBase = {
  offerId: string;
  offerName: string;
  offerType: SoftwareTechOfferType;
  analysisPeriod: KpiPeriod;
  softwareConfig: SoftwareTechConfig;
  newCustomersPerPeriod: number;
  cacInputMode?: "derived" | "direct";
  marketingSpendPerPeriod?: number;
  directCac?: number;
};
```

Shared meaning:
- `newCustomersPerPeriod`: sales velocity / new logos acquired in the analysis period
- `marketingSpendPerPeriod` or `directCac`: acquisition input
- `softwareConfig`: software-native metadata used by the UI and report layer

### Offer-specific input categories

1. Recurring pricing inputs
- used by `software_subscription`, `software_token_pricing`, `software_hybrid_platform_usage`, `software_implementation_plus_subscription`
- examples:
  - `platformFeePerPeriod`
  - `seatPricePerPeriod`
  - `averageSeatsPerCustomer`
  - `usageUnitsPerCustomerPerPeriod`
  - `pricePerUsageUnit`

2. Delivery-cost inputs
- examples:
  - `grossMargin`
  - `deliveryCostPerCustomerPerPeriod`
  - `costPerUsageUnit`
  - `fixedDeliveryCostPerPeriod`
  - `implementationDeliveryCostPerNewCustomer`

3. Retention inputs
- used only where recurring customer base matters
- examples:
  - `activeCustomersStart`
  - `directChurnRatePerPeriod`
  - `retainedCustomersFromStartAtEnd`
  - `churnedCustomersPerPeriod`

4. One-time commercialization inputs
- used by `software_paid_pilot` and `software_implementation_plus_subscription`
- examples:
  - `pilotFeePerNewCustomer`
  - `pilotDeliveryCostPerNewCustomer`
  - `implementationFeePerNewCustomer`
  - `implementationDeliveryCostPerNewCustomer`

## Offer-Type Mapping

## 1. `software_subscription`

Status:
- already implemented
- must remain unchanged in behavior

Normalization:
- `acquisition`: current derived/direct CAC logic
- `recurring`: current ARPC, gross profit, churn/retention, and start-customer logic
- `oneTime`: `null`
- `forecastMode`: `recurring`

Output mapping:
- keep existing `KPIResult` semantics unchanged

## 2. `software_paid_pilot`

Business shape:
- customer is acquired
- pilot fee is charged once
- profit is realized from the pilot
- no recurring subscription is modeled in this offer type

Required minimum inputs:
```ts
export type SoftwarePaidPilotInput = SoftwareOfferInputBase & {
  offerType: "software_paid_pilot";
  pilotFeePerNewCustomer: number;
  pilotDeliveryCostPerNewCustomer?: number;
  pilotGrossMargin?: number;
};
```

Normalization:
- `acquisition`: direct or derived CAC
- `recurring`: `null`
- `oneTime.revenuePerNewCustomer = pilotFeePerNewCustomer`
- `oneTime.grossProfitPerNewCustomer`:
  - either `pilotFeePerNewCustomer * pilotGrossMargin`
  - or `pilotFeePerNewCustomer - pilotDeliveryCostPerNewCustomer`
- `forecastMode`: `throughput`

Output mapping:
- `cac`: normal CAC
- `arpc`: set to pilot revenue per new customer for comparability
- `churnRate`: `null`
- `retentionRate`: `null`
- `ltv`: one-time revenue per new customer
- `ltgpPerCustomer`: one-time gross profit per new customer
- `ltgpToCacRatio`: one-time LTGP divided by CAC
- `cacPaybackPeriods`: `cac / grossProfitPerNewCustomer`
- `hypotheticalMaxCustomers`: `null`
- `hypotheticalMaxRevenuePerYear`: `null`
- `hypotheticalMaxProfitPerYear`: `null`
- `projectedRevenueNextYear`: annualized throughput revenue from new pilots
- `projectedProfitNextYear`: annualized throughput gross profit from new pilots minus acquisition spend
- `car`: `newCustomersPerPeriod`

Reason for null ceiling metrics:
- there is no churn-based steady state without a recurring base
- using annual throughput as “max” would be misleading

## 3. `software_token_pricing`

Business shape:
- recurring customer/account base
- monetization comes from usage or token consumption
- revenue and gross profit per customer are derived from usage assumptions

Required minimum inputs:
```ts
export type SoftwareTokenPricingInput = SoftwareOfferInputBase & {
  offerType: "software_token_pricing";
  activeCustomersStart?: number;
  retentionInputMode?: "counts" | "rate";
  directChurnRatePerPeriod?: number;
  churnedCustomersPerPeriod?: number;
  retainedCustomersFromStartAtEnd?: number;
  usageUnitsPerCustomerPerPeriod: number;
  pricePerUsageUnit: number;
  costPerUsageUnit?: number;
  fixedDeliveryCostPerPeriod?: number;
};
```

Normalization:
- `acquisition`: normal CAC path
- `recurring.arpcPerActiveCustomerPerPeriod = usageUnitsPerCustomerPerPeriod * pricePerUsageUnit`
- `recurring.grossProfitPerActiveCustomerPerPeriod = usageUnitsPerCustomerPerPeriod * (pricePerUsageUnit - costPerUsageUnit) - fixedCostShare`
- `recurring.churnRatePerPeriod`: count-based or direct-rate path
- `oneTime`: `null`
- `forecastMode`: `recurring`

Output mapping:
- same recurring semantics as `software_subscription`
- difference is only how ARPC and gross profit are derived

## 4. `software_hybrid_platform_usage`

Business shape:
- recurring platform fee
- plus recurring usage-based component
- customer churn still governs active account base

Required minimum inputs:
```ts
export type SoftwareHybridPlatformUsageInput = SoftwareOfferInputBase & {
  offerType: "software_hybrid_platform_usage";
  activeCustomersStart?: number;
  retentionInputMode?: "counts" | "rate";
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
```

Normalization:
- `acquisition`: normal CAC path
- `recurring.arpcPerActiveCustomerPerPeriod = platformFeePerCustomerPerPeriod + usageUnitsPerCustomerPerPeriod * pricePerUsageUnit`
- `recurring.grossProfitPerActiveCustomerPerPeriod = platform gross profit + usage gross profit - fixed cost share`
- `recurring.churnRatePerPeriod`: count-based or direct-rate path
- `oneTime`: `null`
- `forecastMode`: `recurring`

Output mapping:
- same recurring semantics as `software_subscription`
- ARPC and gross profit are blended across platform + usage components

## 5. `software_implementation_plus_subscription`

Business shape:
- upfront implementation/onboarding fee when a new customer closes
- recurring subscription revenue after onboarding
- recurring churn governs the installed base

Required minimum inputs:
```ts
export type SoftwareImplementationPlusSubscriptionInput = SoftwareOfferInputBase & {
  offerType: "software_implementation_plus_subscription";
  activeCustomersStart?: number;
  retentionInputMode?: "counts" | "rate";
  directChurnRatePerPeriod?: number;
  churnedCustomersPerPeriod?: number;
  retainedCustomersFromStartAtEnd?: number;
  subscriptionRevenueInputMode?: "direct_arpc" | "component_sum";
  directArpc?: number;
  grossProfitInputMode?: "margin" | "costs";
  grossMargin?: number;
  deliveryCostPerCustomerPerPeriod?: number;
  fixedDeliveryCostPerPeriod?: number;
  implementationFeePerNewCustomer: number;
  implementationDeliveryCostPerNewCustomer?: number;
  implementationGrossMargin?: number;
};
```

Normalization:
- `acquisition`: normal CAC path
- `recurring`: same recurring logic as subscription
- `oneTime.revenuePerNewCustomer = implementationFeePerNewCustomer`
- `oneTime.grossProfitPerNewCustomer`:
  - either `implementationFeePerNewCustomer * implementationGrossMargin`
  - or `implementationFeePerNewCustomer - implementationDeliveryCostPerNewCustomer`
- `forecastMode`: `mixed`

Output mapping:
- `cac`: normal CAC
- `arpc`: recurring ARPC only
- `churnRate` / `retentionRate`: recurring customer churn only
- `ltv`: one-time revenue per new customer + recurring lifetime revenue per customer
- `ltgpPerCustomer`: one-time gross profit per new customer + recurring lifetime gross profit per customer
- `ltgpToCacRatio`: blended LTGP divided by CAC
- `cacPaybackPeriods`: CAC divided by first-period economic contribution, where contribution is `oneTime gross profit per new customer + recurring gross profit per active customer per period`
- `hypotheticalMaxCustomers`: recurring steady-state customers only
- `hypotheticalMaxRevenuePerYear`: recurring steady-state annual revenue + annual implementation throughput revenue
- `hypotheticalMaxProfitPerYear`: recurring steady-state annual profit + annual implementation throughput gross profit
- `projectedRevenueNextYear`: recurring next-year revenue + implementation revenue from new customers acquired during the year
- `projectedProfitNextYear`: recurring next-year profit + implementation gross profit from new customers acquired during the year
- `car`: `newCustomersPerPeriod`

## Shared Evaluator Responsibilities

After normalization, the shared evaluator should handle three modes.

### 1. `recurring`
Used by:
- `software_subscription`
- `software_token_pricing`
- `software_hybrid_platform_usage`

Evaluator behavior:
- use churn/retention to derive steady-state customers
- derive ceiling revenue/profit from recurring ARPC and recurring gross profit
- use recurring forecast path for next-year projection

### 2. `throughput`
Used by:
- `software_paid_pilot`

Evaluator behavior:
- no churn-based ceiling
- annualize one-time revenue/profit based on sales velocity
- return null for ceiling metrics that depend on recurring steady state

### 3. `mixed`
Used by:
- `software_implementation_plus_subscription`

Evaluator behavior:
- recurring side uses churn-based forecast and steady-state logic
- one-time side annualizes throughput from new customers
- next-year projection and steady-state annual metrics sum both contributions where appropriate

## Public KPI Semantics

The public `KPIResult` shape stays unchanged.

Interpretation rules by offer family:
- for recurring offers, current KPI meaning stays the same
- for throughput-only offers, churn/retention and steady-state customer ceiling metrics are null
- for mixed offers, ARPC and churn describe the recurring side, while LTV/LTGP and projected totals include one-time plus recurring contribution

This avoids API breakage while keeping the math semantically honest.

## Validation Rules

Validation should remain offer-specific and strict.

Examples:
- `software_paid_pilot` must require either pilot gross margin or pilot delivery cost path
- `software_token_pricing` must require usage units per customer and price per usage unit
- `software_hybrid_platform_usage` must require both platform and usage pricing inputs
- `software_implementation_plus_subscription` must require implementation fee plus recurring subscription inputs
- recurring offer types must require retention inputs
- throughput-only offers must not require churn inputs

## Non-Goals For This Phase

Do not add:
- API route changes
- database migrations
- report schema changes
- new frontend flows beyond what is needed to eventually collect the new input types
- AI recommendation behavior

## Recommended File Shape

Expected implementation footprint:
- `src/features/kpi/types.ts`
  - add discriminated input types for new software/tech offers
- `src/features/kpi/schema.ts`
  - add offer-specific schemas and shared software input building blocks
- `src/features/kpi/software-tech.ts`
  - extend revenue-component and monetization definitions if needed
- `src/features/kpi/software-tech-monetization.ts`
  - new file for normalization helpers and normalized internal types
- `src/features/kpi/offer-evaluator.ts`
  - keep `software_subscription` path unchanged, then route new offer types into the shared evaluator when implemented
- `tests/*`
  - add normalization and evaluator coverage before new UI work

## Implementation Order

1. Introduce normalized internal software economics types and helpers.
2. Refactor `software_subscription` to use the shared internal normalization without changing outputs.
3. Implement `software_paid_pilot`.
4. Implement `software_token_pricing`.
5. Implement `software_hybrid_platform_usage`.
6. Implement `software_implementation_plus_subscription`.
7. Update the UI offer picker and input forms only after the engine paths are proven.

## Checkpoints

The following must hold after each implementation step:
- current `software_subscription` tests still pass unchanged
- current legacy math lock still passes unchanged
- no API or DB contract change is required
- `npm test`, `npm run lint`, and `npm run build` stay green
