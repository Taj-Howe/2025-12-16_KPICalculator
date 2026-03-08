# Payments and Accounting Integrations Spec

## Objective

Define a normalized imported-data model and future integration surface so payment platforms and accounting systems can populate the calculator without changing the existing KPI math.

This spec is intentionally conservative:

- do not change the current `KPIResult` shape
- do not change the current KPI evaluator formulas
- do not assume one provider can fully populate every calculator field
- prefer explicit data quality flags over silent derivation
- keep imported data normalized before mapping it into offer inputs

Primary target sources:

- Stripe or other payment/billing platforms
- accounting systems such as QuickBooks or Xero

## Scope

This spec covers:

- how imported payment/accounting data should map into the current calculator
- the normalized entities required for imported business data
- period metrics for:
  - revenue
  - refunds
  - gross receipts
  - net receipts
  - active subscriptions/customers
  - churn/retention signals
  - CAC inputs where derivable
  - margin/drift signals where available
- what can be imported automatically vs what remains manual
- the future internal API surface for integrations

This spec does not cover:

- one-click OAuth implementation
- provider SDK usage
- UI flows
- persistence migrations
- data warehouse or BI features

## Design Principles

1. Imported data must normalize into stable internal entities before touching KPI inputs.
2. Payment data and accounting data solve different problems; neither is a complete source of truth by itself.
3. The calculator remains offer-based. Imported data must map to one offer or offer line at a time.
4. When data is incomplete, the system must preserve that gap explicitly instead of fabricating fields.
5. Imported cash metrics, accounting metrics, and recurring retention metrics must stay distinct.

## Current Calculator Constraints

The current calculator expects one offer input at a time, with software-first support for:

- `software_subscription`
- `software_paid_pilot`
- `software_token_pricing`
- `software_hybrid_platform_usage`
- `software_implementation_plus_subscription`

Current KPI math depends on these kinds of values:

- acquisition velocity: `newCustomersPerPeriod`
- acquisition cost:
  - `marketingSpendPerPeriod`
  - or `directCac`
- recurring revenue / price:
  - `revenuePerPeriod`
  - or `directArpc`
  - or offer-specific pricing fields
- retention / churn:
  - `directChurnRatePerPeriod`
  - or `retainedCustomersFromStartAtEnd`
  - or `churnedCustomersPerPeriod`
- customer base:
  - `activeCustomersStart`
- delivery economics:
  - gross margin fields
  - or explicit delivery-cost fields

The integration layer must therefore produce calculator-ready offer snapshots, not raw transactions.

## Important Assumptions

### 1. Payment platforms are strongest at:

- billed cash inflows
- refunds
- invoice/subscription state
- product/price-line attribution
- active recurring customer counts

### 2. Accounting systems are strongest at:

- categorized expense totals
- processor fees
- refunds/contra-revenue if booked correctly
- operating cost trends
- marketing spend, if accounts are mapped

### 3. Payment and accounting systems are weak at:

- true offer-level delivery cost for software usage
- reliable acquisition attribution by offer
- cohort-quality churn without customer identity consistency
- margin by offer unless bookkeeping is mapped intentionally

### 4. First integration release must treat some inputs as manual even after import:

- token/unit delivery cost if not booked per offer
- gross margin if accounting categories are not mapped cleanly
- acquisition spend if no expense mapping exists
- price/ARPC assumptions where billing lines are blended across offers

## Three-Layer Model

The import system should use three layers.

### Layer 1: Source Records

Provider-native records from Stripe/accounting systems.

Examples:

- Stripe invoice
- Stripe charge
- Stripe refund
- Stripe subscription
- QuickBooks journal line
- QuickBooks expense transaction

These should not be passed into the calculator directly.

### Layer 2: Normalized Imported Data

Provider-native records are mapped into a common internal model.

### Layer 3: Calculator Offer Snapshot

Normalized data is aggregated into one period snapshot for one offer.

That snapshot is then adapted into one of the existing offer input types.

## Normalized Imported Entities

### Integration Source

```ts
type IntegrationSource = {
  sourceId: string;
  provider: "stripe" | "quickbooks" | "xero" | "manual_csv";
  connectionLabel: string;
  sourceKind: "payments" | "accounting";
  status: "connected" | "syncing" | "error" | "disconnected";
};
```

### Import Window

```ts
type ImportWindow = {
  startAt: string;
  endAt: string;
  analysisPeriod: "monthly" | "quarterly" | "yearly";
};
```

### Normalized Customer

```ts
type NormalizedCustomer = {
  customerKey: string;
  externalCustomerId: string;
  sourceId: string;
  firstPaidAt: string | null;
  currentStatus: "active" | "canceled" | "past_due" | "inactive" | "unknown";
};
```

### Normalized Offer Mapping

This is the critical bridge between external systems and the calculator.

```ts
type NormalizedOfferMapping = {
  offerKey: string;
  offerName: string;
  offerType:
    | "software_subscription"
    | "software_paid_pilot"
    | "software_token_pricing"
    | "software_hybrid_platform_usage"
    | "software_implementation_plus_subscription";
  externalProductKeys: string[];
  externalPriceKeys: string[];
  revenueClassification:
    | "subscription_base"
    | "usage"
    | "pilot"
    | "implementation"
    | "hybrid_base"
    | "hybrid_usage";
};
```

### Normalized Revenue Event

```ts
type NormalizedRevenueEvent = {
  revenueEventId: string;
  sourceId: string;
  customerKey: string | null;
  offerKey: string | null;
  occurredAt: string;
  servicePeriodStart: string | null;
  servicePeriodEnd: string | null;
  category:
    | "subscription"
    | "usage"
    | "pilot"
    | "implementation"
    | "discount"
    | "tax"
    | "processor_fee_adjustment";
  grossAmount: number;
  refundedAmount: number;
  netAmount: number;
  currency: string;
  quantity: number | null;
  unitAmount: number | null;
};
```

### Normalized Refund Event

```ts
type NormalizedRefundEvent = {
  refundEventId: string;
  sourceId: string;
  customerKey: string | null;
  offerKey: string | null;
  occurredAt: string;
  amount: number;
  currency: string;
  originalRevenueEventId: string | null;
};
```

### Normalized Expense Event

```ts
type NormalizedExpenseEvent = {
  expenseEventId: string;
  sourceId: string;
  occurredAt: string;
  amount: number;
  currency: string;
  category:
    | "marketing"
    | "sales"
    | "processor_fees"
    | "cogs"
    | "hosting"
    | "ai_inference"
    | "support"
    | "implementation_labor"
    | "overhead"
    | "unknown";
  mappedRole:
    | "cac_eligible"
    | "delivery_cost"
    | "implementation_cost"
    | "overhead"
    | "excluded";
  offerKey: string | null;
};
```

### Normalized Subscription State

```ts
type NormalizedSubscriptionState = {
  subscriptionKey: string;
  sourceId: string;
  customerKey: string;
  offerKey: string | null;
  status:
    | "trialing"
    | "active"
    | "past_due"
    | "paused"
    | "canceled"
    | "incomplete"
    | "unknown";
  startedAt: string | null;
  canceledAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  billingInterval: "monthly" | "quarterly" | "yearly" | "custom" | "unknown";
};
```

### Normalized Offer Period Snapshot

This is the main internal product of the import layer.

```ts
type NormalizedOfferPeriodSnapshot = {
  offerKey: string;
  offerName: string;
  offerType:
    | "software_subscription"
    | "software_paid_pilot"
    | "software_token_pricing"
    | "software_hybrid_platform_usage"
    | "software_implementation_plus_subscription";
  analysisPeriod: "monthly" | "quarterly" | "yearly";
  windowStart: string;
  windowEnd: string;

  revenue: {
    grossReceipts: number | null;
    refunds: number | null;
    netReceipts: number | null;
    recognizedRevenueApprox: number | null;
    subscriptionRevenue: number | null;
    usageRevenue: number | null;
    pilotRevenue: number | null;
    implementationRevenue: number | null;
  };

  customers: {
    activeCustomersStart: number | null;
    activeCustomersEnd: number | null;
    newCustomers: number | null;
    retainedFromStart: number | null;
    churnedFromStart: number | null;
    directChurnRate: number | null;
  };

  acquisition: {
    marketingSpend: number | null;
    salesSpend: number | null;
    cacEligibleSpend: number | null;
    directCac: number | null;
  };

  delivery: {
    cogs: number | null;
    processorFees: number | null;
    hostingCost: number | null;
    aiInferenceCost: number | null;
    supportCost: number | null;
    implementationCost: number | null;
    observableGrossMargin: number | null;
  };

  usage: {
    totalUsageUnits: number | null;
    usageUnitsPerCustomer: number | null;
    pricePerUsageUnit: number | null;
    costPerUsageUnit: number | null;
  };

  quality: {
    dataCompleteness: "high" | "medium" | "low";
    missingFields: string[];
    assumptions: string[];
    warnings: string[];
  };
};
```

## Metric Definitions

### Revenue

For this integration layer, `revenue` should be tracked in two forms:

- `recognizedRevenueApprox`
- `cash receipts`

Reason:

- payment platforms are mostly cash/billing systems
- accounting systems may better represent booked revenue
- the current calculator is operational, not GAAP-perfect

First implementation rule:

- use `recognizedRevenueApprox` when it is available from normalized invoice/service-period data
- otherwise fall back to `netReceipts` with an explicit assumption flag

### Gross Receipts

Definition:

- successful billed inflows before refunds
- excludes taxes if those are identifiable

### Refunds

Definition:

- cash returned to customers within the analysis window

### Net Receipts

Definition:

- `grossReceipts - refunds`

Processor fees should not reduce `netReceipts`. They belong in delivery or expense treatment.

### Active Subscriptions / Customers

Definition:

- recurring customers active at the start and end of the analysis window

First implementation rule:

- only count customers mapped to the selected offer
- multi-offer customers should count once per mapped offer, not once globally

### Churn / Retention Signals

Priority order:

1. direct retained-start-cohort count
2. direct churned-start-cohort count
3. direct rate derived from mapped cohort state
4. fallback using active-start vs active-end only with a weaker-quality flag

Important:

- passive subscriber count movement is not the same as cohort retention
- failed payments, pauses, and involuntary churn must be flagged if included

### CAC Inputs

Derivable only when mapped spend exists.

Preferred derivation:

- `cacEligibleSpend / newCustomers`

Where `cacEligibleSpend` may include:

- mapped marketing accounts
- mapped sales acquisition labor
- optionally mapped agency/software costs if user marks them acquisition-related

If no mapped spend exists:

- leave `directCac` and `marketingSpendPerPeriod` null
- require manual input in the calculator

### Margin / Drift Signals

Potentially available from accounting systems when accounts are mapped.

Examples:

- processor fee drift
- hosting cost drift
- AI inference cost drift
- support cost drift
- observable gross margin drift

Important:

- payment systems alone usually cannot provide real software delivery margin
- token or infrastructure delivery costs usually require accounting or internal cost feeds

## Offer-Type Mapping Rules

## 1. `software_subscription`

Automatic candidates:

- `newCustomersPerPeriod` from new paid subscriptions in window
- `activeCustomersStart` from subscriptions active at window start
- `retainedCustomersFromStartAtEnd` from surviving start cohort
- `revenuePerPeriod` from subscription revenue
- `marketingSpendPerPeriod` from mapped CAC-eligible expenses

Manual fallbacks:

- `grossMargin` if no mapped delivery-cost view exists
- `directCac` if spend mapping is missing

## 2. `software_paid_pilot`

Automatic candidates:

- `newCustomersPerPeriod` from new pilot invoices/customers
- `pilotFeePerNewCustomer` from average mapped pilot invoice amount
- `marketingSpendPerPeriod` from mapped CAC-eligible expenses

Manual fallbacks:

- `pilotGrossMargin`
- `pilotDeliveryCostPerNewCustomer`

Reason:

- payment/accounting systems may know revenue, but often not pilot delivery effort per pilot

## 3. `software_token_pricing`

Automatic candidates:

- `newCustomersPerPeriod` from new paying customers
- `activeCustomersStart`
- `retainedCustomersFromStartAtEnd`
- `usageUnitsPerCustomerPerPeriod` from metered invoice quantity if available
- `pricePerUsageUnit` from invoice line effective unit price
- `revenue` from usage revenue

Manual or partially automatic:

- `costPerUsageUnit`
- `fixedDeliveryCostPerPeriod`
- `marketingSpendPerPeriod` if accounting mapping exists

## 4. `software_hybrid_platform_usage`

Automatic candidates:

- `platformFeePerCustomerPerPeriod` from recurring base-fee lines
- `usageUnitsPerCustomerPerPeriod` from metered lines
- `pricePerUsageUnit` from usage lines
- recurring customer counts and retention fields

Manual or partially automatic:

- `platformDeliveryCostPerCustomerPerPeriod`
- `costPerUsageUnit`
- `fixedDeliveryCostPerPeriod`
- CAC inputs if accounting mapping is incomplete

## 5. `software_implementation_plus_subscription`

Automatic candidates:

- recurring subscription price from recurring lines
- implementation fee from one-time implementation lines
- recurring customer counts and retention fields
- new customers from newly implemented accounts

Manual or partially automatic:

- implementation delivery cost
- recurring delivery cost or gross margin
- CAC inputs if spend mapping is incomplete

## Automatic vs Manual Input Matrix

### Safe to import automatically in first release

- gross receipts
- refunds
- net receipts
- offer-mapped revenue by line type
- active recurring customers at period start/end
- new paid customers in period
- retained/churned start cohort when subscription state is available
- mapped marketing spend totals from accounting
- processor fee totals

### Import automatically only with explicit account/product mapping

- offer-level CAC-eligible spend
- offer-level implementation cost
- offer-level hosting or AI inference cost
- offer-level support cost
- offer-level recognized revenue approximations

### Leave manual unless a source clearly supports it

- delivery cost per active customer
- cost per usage unit
- fixed delivery cost per period
- gross margin assumptions
- direct CAC overrides

## Data Quality and Gaps

The integration layer must emit explicit quality flags.

### Common data gaps

- taxes mixed into billed amounts
- discounts not separated from revenue
- refunds posted in a later period than the original charge
- customer identity drift across systems
- one invoice containing multiple offers
- no accounting account mapping for marketing spend
- no accounting mapping for delivery costs
- no metered quantity data in the payment source
- accounting data aggregated at company level, not offer level

### Required quality flags

- `usedCashReceiptsFallback`
- `missingOfferMapping`
- `missingCacEligibleSpend`
- `missingDeliveryCostMapping`
- `retentionDerivedFromWeakSignal`
- `multiOfferAllocationRequired`
- `currencyMixed`

## Calculator Mapping Layer

Normalized snapshots should not be passed directly to UI state. They should be adapted into calculator inputs using a dedicated mapper.

The dashboard analytics layer may read normalized snapshots directly for imported
trend views such as revenue, refunds, observable margin, and cohort movement.
Any scenario ranking, payback, or KPI-level decision output must still go
through the calculator mapping layer first so imported analytics and calculator
math stay aligned.

```ts
type ImportedSnapshotToCalculatorResult = {
  offerInput:
    | SubscriptionOfferInput
    | SoftwarePaidPilotInput
    | SoftwareTokenPricingInput
    | SoftwareHybridPlatformUsageInput
    | SoftwareImplementationPlusSubscriptionInput
    | null;
  unmappedFields: string[];
  assumptionsApplied: string[];
  warnings: string[];
};
```

### Mapping rules

1. Prefer explicit offer-specific fields over generic revenue fields.
2. Do not populate cost-based inputs from company-level accounting totals unless an offer allocation rule exists.
3. If retention quality is weak, prefer leaving churn manual instead of writing misleading counts.
4. Preserve imported assumptions so the calculator can show the user what was auto-filled vs still manual.

## Future Internal API Surface

These are internal app/API contracts, not public provider SDK calls.

### Source registration

```ts
POST /api/integrations/sources
```

Creates a source record and provider config shell.

### Offer mapping

```ts
POST /api/integrations/offer-mappings
GET /api/integrations/offer-mappings
```

Maps provider products/prices/accounts to one calculator offer.

### Account/category mapping

```ts
POST /api/integrations/account-mappings
GET /api/integrations/account-mappings
```

Maps accounting categories into:

- CAC-eligible spend
- delivery cost
- implementation cost
- overhead

### Sync run

```ts
POST /api/integrations/sync
GET /api/integrations/sync/:syncId
```

Runs a source import and normalization pass.

### Snapshot query

```ts
GET /api/integrations/snapshots?offerKey=...&period=...&start=...&end=...
```

Returns normalized offer period snapshots.

### Calculator suggestion

```ts
GET /api/integrations/snapshots/:snapshotId/calculator-input
```

Returns the calculator-ready offer input plus assumptions/warnings.

## Stripe-Specific Notes

Stripe can usually provide:

- invoices
- invoice lines
- prices/products
- subscriptions
- customers
- refunds
- charges
- discounts

Stripe usually cannot provide:

- full CAC
- software delivery cost
- implementation labor cost
- true gross margin

Stripe is therefore strongest for:

- revenue
- receipts
- refunds
- subscription state
- usage billing quantities

First shipped connector rule:

- use explicit API-key connection first
- normalize invoices, invoice lines, refunds, and subscriptions
- defer OAuth, webhooks, and durable connector persistence until the contract surface is stable

## Accounting-Specific Notes

Accounting systems can usually provide:

- categorized spend
- processor fees
- refunds/contra-revenue
- company-level COGS
- hosting and infrastructure costs

Accounting systems usually struggle with:

- offer-level product mapping
- recurring cohort retention
- exact start-cohort subscription state

Accounting is therefore strongest for:

- CAC-eligible spend if mapped
- delivery-cost and margin drift signals
- company-level sanity checks on imported cash data

## First Implementation Boundaries

First implementation should be intentionally narrow:

1. Support one offer snapshot at a time.
2. Support Stripe-first payments import and one accounting mapping model later.
3. Normalize imported data into offer snapshots before adapting into calculator inputs.
4. Do not attempt automatic multi-offer cost allocation in v1.
5. Do not infer gross margin if delivery-cost observability is weak.
6. Require explicit account/product mapping for anything that affects CAC or margin.

## Recommended Implementation Order

1. Add normalized imported-data types.
2. Add offer/product/account mapping types.
3. Implement normalized offer period snapshot derivation.
4. Implement snapshot-to-calculator adapters for supported offer types.
5. Add the internal integration API surface.
6. Add the first provider connector.
7. Only then add one-click auth/setup flows.

## Verification Requirements

Future implementation must prove:

- imported offer snapshots are deterministic for a fixed sync window
- mapped payment data and accounting data do not overwrite each other ambiguously
- missing CAC/margin data stays explicit
- offer snapshots map cleanly into existing calculator input types
- imported assumptions and warnings are surfaced to the user
- connectors can be added without changing calculator math
