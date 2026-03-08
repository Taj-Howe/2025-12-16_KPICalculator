# E-commerce Monetization Engine Spec

## Objective

Add an honest e-commerce path on top of the current offer engine without cloning
the software logic or introducing a separate KPI system.

This phase is intentionally conservative:

- keep all current software/tech behavior unchanged
- keep the public `KPIResult` shape unchanged
- reuse the current acquisition, LTGP:CAC, payback, projection, and export model
- add only the first e-commerce offer shapes that can be represented honestly

## Product Goal

The first e-commerce rollout should let an operator model **one product line /
offer first**, then answer:

- how much gross profit each acquired customer is worth
- how that compares to CAC
- how fast CAC is paid back
- what steady-state or repeat-driven upside exists
- what operational lever matters most next

The math should stay centered on:

- `LTGP:CAC`
- payback
- gross margin
- repeat purchase / replenishment behavior
- refund drag

## Initial Offer Scope

The first e-commerce implementation should support these offer types:

1. `ecommerce_one_time_product`
2. `ecommerce_repeat_purchase_product`
3. `ecommerce_subscription_replenishment`

This offer type should remain staged:

4. `ecommerce_bundle_offer`

Reason:

- the first three are clean enough to model with current economics
- bundle logic needs product grouping and attribution rules that should not be
  guessed in the first implementation

## Current Engine Constraints

The current system already supports two honest shapes:

- recurring customer-base offers
- throughput / one-time offers

E-commerce should map into those shapes instead of inventing new KPI semantics.

That means:

- one-time product -> throughput economics
- repeat purchase product -> repeat-lifetime economics derived from purchase
  count assumptions
- subscription replenishment -> recurring retention/churn path

## Proposed E-commerce Offer Types

### 1. `ecommerce_one_time_product`

Business shape:

- acquire a customer
- one order is placed
- one order-level gross profit is realized
- no repeat behavior is assumed in this offer type

Minimum inputs:

```ts
type EcommerceOneTimeProductInput = EcommerceOfferInputBase & {
  offerType: "ecommerce_one_time_product";
  averageOrderValue: number;
  grossProfitPerOrder?: number;
  grossMargin?: number;
  refundsRatePerOrder?: number;
};
```

Interpretation:

- `averageOrderValue`: gross revenue per first order
- `grossProfitPerOrder`: preferred direct contribution input
- `grossMargin`: allowed fallback if direct gross profit is not known
- `refundsRatePerOrder`: optional revenue/profit drag

Output mapping:

- `arpc` -> `averageOrderValue` adjusted for refund rate if applicable
- `ltv` -> one order revenue per acquired customer
- `ltgpPerCustomer` -> one order gross profit per acquired customer
- `ltgpToCacRatio` -> one-time LTGP divided by CAC
- `cacPaybackPeriods` -> `cac / grossProfitPerOrder`
- `hypotheticalMax*` -> `null`
- `projectedRevenueNextYear` -> annualized acquisition throughput revenue
- `projectedProfitNextYear` -> annualized gross profit minus acquisition spend

### 2. `ecommerce_repeat_purchase_product`

Business shape:

- acquire a customer
- customer makes a first purchase
- some fraction repurchases over time
- lifetime value comes from total expected orders per customer

Minimum inputs:

```ts
type EcommerceRepeatPurchaseProductInput = EcommerceOfferInputBase & {
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
```

Conservative rule:

- v1 should prefer `expectedOrdersPerCustomer`
- `repurchaseRatePerPeriod` may be allowed only if paired with a fixed
  `analysisHorizonPeriods`
- first implementation should ship only the `expectedOrdersPerCustomer` path and
  keep `repurchaseRatePerPeriod` staged until the semantics are proven

Reason:

- “repeat purchase rate” is often ambiguous
- direct `expectedOrdersPerCustomer` is easier to explain and less likely to
  create fake precision

Output mapping:

- `arpc` -> first-order AOV, not total lifetime revenue
- `ltv` -> `netRevenuePerOrder * expectedOrdersPerCustomer`
- `ltgpPerCustomer` -> `grossProfitPerOrder * expectedOrdersPerCustomer`
- `ltgpToCacRatio` -> repeat-driven LTGP divided by CAC
- `cacPaybackPeriods` -> first-order or first-period payback only; do not fake
  instant full-lifetime payback
- `hypotheticalMax*` -> `null` in v1
- `projectedRevenueNextYear` / `projectedProfitNextYear` -> acquisition
  throughput annualization using the repeat-lifetime assumption

Important honesty rule:

- first-order economics and lifetime economics must be presented separately in
  UI copy, even if they share the same `KPIResult` envelope

### 3. `ecommerce_subscription_replenishment`

Business shape:

- recurring order cadence
- active subscriber/customer base matters
- retention/churn determines lifetime and steady-state ceiling

Minimum inputs:

```ts
type EcommerceSubscriptionReplenishmentInput = EcommerceOfferInputBase & {
  offerType: "ecommerce_subscription_replenishment";
  averageOrderValue: number;
  ordersPerSubscriberPerPeriod?: number;
  grossProfitPerSubscriberPerPeriod?: number;
  grossMargin?: number;
  refundsRatePerPeriod?: number;
  activeCustomersStart: number;
  retentionInputMode?: "counts" | "rate";
  directChurnRatePerPeriod?: number;
  churnedCustomersPerPeriod?: number;
  retainedCustomersFromStartAtEnd?: number;
};
```

Output mapping:

- maps to the same recurring evaluator shape as software subscriptions
- `arpc` -> net recurring revenue per active subscriber per period
- `ltv`, `ltgpPerCustomer`, `payback`, `hypotheticalMax*`, and
  `projected*NextYear` all work through the churn-based recurring path

This should be the first e-commerce offer type that supports:

- steady-state ceiling metrics
- live recurring forecast
- churn-based health thresholds

### 4. `ecommerce_bundle_offer` (staged)

Do not implement in the first slice.

Required before implementation:

- bundle attribution rules
- product grouping rules
- clear distinction between:
  - merchandising bundle
  - AOV-boosting checkout bundle
  - true bundle-only offer line

Until then, bundle behavior should be represented through:

- one-time product
- repeat-purchase product
- imported-data grouping suggestions

## Shared E-commerce Input Base

```ts
type EcommerceOfferInputBase = {
  offerId: string;
  offerName: string;
  analysisPeriod: KpiPeriod;
  offerType: EcommerceOfferType;
  ecommerceConfig: EcommerceConfig;
  newCustomersPerPeriod: number;
  cacInputMode?: "derived" | "direct";
  marketingSpendPerPeriod?: number;
  directCac?: number;
};
```

Shared meaning:

- `newCustomersPerPeriod` -> acquisition velocity
- `marketingSpendPerPeriod` or `directCac` -> acquisition cost path
- `ecommerceConfig` -> industry metadata for UI, reports, and future import
  inference

## Proposed E-commerce Metadata

```ts
type EcommerceOfferType =
  | "ecommerce_one_time_product"
  | "ecommerce_repeat_purchase_product"
  | "ecommerce_subscription_replenishment"
  | "ecommerce_bundle_offer";

type EcommerceMonetizationModel =
  | "one_time_product"
  | "repeat_purchase"
  | "subscription_replenishment"
  | "bundle_offer";

type EcommerceConfig = {
  industryPreset: "ecommerce";
  monetizationModel: EcommerceMonetizationModel;
  merchandisingModel?: "single_sku" | "catalog" | "bundle";
  fulfillmentModel?: "in_house" | "3pl" | "dropship" | "digital_goods";
  notes?: string;
};
```

## Shared Normalized Internal Shape

E-commerce should normalize into a dedicated internal model parallel to the
software normalization layer, but it should still feed the same public KPI
envelope.

```ts
type NormalizedEcommerceAcquisition = {
  newCustomersPerPeriod: number;
  cacPerNewCustomer: number | null;
  acquisitionSpendPerPeriod: number;
};

type NormalizedOrderEconomics = {
  netRevenuePerOrder: number | null;
  grossProfitPerOrder: number | null;
};

type NormalizedRepeatModel =
  | {
      repeatMode: "none";
    }
  | {
      repeatMode: "lifetime_orders";
      expectedOrdersPerCustomer: number;
    }
  | {
      repeatMode: "subscription";
      activeCustomersStart: number | null;
      churnRatePerPeriod: number | null;
      retentionRatePerPeriod: number | null;
      ordersPerCustomerPerPeriod: number | null;
    };

type NormalizedEcommerceEconomics = {
  offerType: EcommerceOfferType;
  analysisPeriod: KpiPeriod;
  acquisition: NormalizedEcommerceAcquisition;
  orderEconomics: NormalizedOrderEconomics;
  repeat: NormalizedRepeatModel;
  assumptionsApplied: string[];
  warnings: string[];
};
```

## Mapping Rules to Current KPIResult

### Revenue and gross profit

- always calculate net order revenue after refund drag if refund rate is
  provided
- always calculate gross profit from:
  - direct gross profit first
  - else `netRevenuePerOrder * grossMargin`

### CAC

- same direct or derived CAC path as software offers

### ARPC

Use honest semantics:

- one-time / repeat purchase -> first order revenue per acquired customer
- replenishment -> recurring net revenue per active customer per period

### LTV

- one-time -> one order revenue
- repeat purchase -> revenue per order times expected orders
- replenishment -> recurring revenue per subscriber divided by churn

### LTGP

- one-time -> gross profit per order
- repeat purchase -> gross profit per order times expected orders
- replenishment -> recurring gross profit per subscriber divided by churn

### Payback

- one-time -> CAC divided by gross profit per order
- repeat purchase -> CAC divided by first-order gross profit, not full lifetime
  profit
- replenishment -> CAC divided by recurring gross profit per period

### Ceiling metrics

Only valid for replenishment in v1:

- `hypotheticalMaxCustomers`
- `hypotheticalMaxRevenuePerYear`
- `hypotheticalMaxProfitPerYear`

These stay `null` for one-time and repeat-purchase products in the first slice.

### Next-year projection

- one-time -> annualized acquisition throughput
- repeat purchase -> annualized acquisition throughput using repeat-lifetime
  assumption
- replenishment -> churn/retention-driven projection from active customer base

## Health Model Direction

E-commerce health should remain weighted toward `LTGP:CAC`, then:

- payback
- gross margin quality
- refund drag
- repeat quality or replenishment churn

First e-commerce thresholds should be conservative and simple:

- `healthy`
- `needs_work`
- `at_risk`
- `insufficient_data`

## Imported-Data Direction

The first e-commerce import layer should infer:

- product-line revenue concentration
- refund rate by product/price grouping
- repeat purchase hints from repeat customer/order behavior
- replenishment / subscribe-and-save hints from recurring invoice cadence

But manual confirmation is still required for:

- product family grouping
- catalog versus single-offer grouping
- which products should be one offer line
- bundle attribution

## Validation Rules

### One-time product

- require AOV
- require either direct gross profit or gross margin
- require direct or derived CAC

### Repeat-purchase product

- require one-time product fields
- require either:
  - `expectedOrdersPerCustomer`
  - or a paired `repurchaseRatePerPeriod` + `analysisHorizonPeriods`
- reject `expectedOrdersPerCustomer < 1`

### Subscription replenishment

- require recurring retention inputs
- require starting active customers
- require either direct gross profit per subscriber or gross margin
- require direct or derived CAC

## Conservative Implementation Order

1. Add e-commerce types and config metadata only.
2. Add schema support for staged e-commerce types.
3. Implement `ecommerce_one_time_product`.
4. Add focused tests and golden/regression coverage.
5. Implement `ecommerce_repeat_purchase_product`.
6. Implement `ecommerce_subscription_replenishment`.
7. Update the industry selector and onboarding once the first two offer types
   are real.
8. Keep `ecommerce_bundle_offer` staged until imported-data grouping is good
   enough.

## Out of Scope for This Phase

- catalog-wide portfolio analytics
- bundle attribution
- discount-code economics
- returns logistics cost modeling beyond simple refund drag
- inventory cash-flow analysis
- shipping-time operational modeling
- accounting-led COGS reconciliation beyond explicit user inputs

## First Recommended Build Slice

The first e-commerce implementation slice should be:

1. add `EcommerceConfig` and staged e-commerce offer types
2. implement `ecommerce_one_time_product`
3. add tests proving software behavior does not drift
4. expose the staged industry selector copy, but keep e-commerce non-actionable
   until the one-time path is fully working

That gives the team the smallest honest foothold in e-commerce without forcing
repeat-purchase or replenishment logic in the same PR.
