# Data Model 


This app stores KPI reports as snapshots. Inputs and results are stored as JSON for flexibility, while key metadata is stored in typed columns.

### Domain enums

#### Period
- monthly
- quarterly
- yearly

#### BusinessModel (legacy)
- subscription
- transactional
- hybrid

#### OfferType (v2)
- subscription
- one_time
- installment
- usage_based
- service_retainer

---

### Entity: User

#### Purpose
Owns saved KPI reports.

#### Fields
- id: string (uuid/cuid)
- email: string (unique)
- name: string | null
- image: string | null
- createdAt: datetime

---

### Entity: KPIReport

#### Purpose
A saved snapshot of inputs + computed results for a specific period/model at a point in time.

#### Fields
- id: string (uuid/cuid)
- userId: string (FK → User.id)
- createdAt: datetime
- title: string | null
- notes: string | null (optional, v2)
- period: "monthly" | "quarterly" | "yearly"
- businessModel: "subscription" | "transactional" | "hybrid"  // legacy compatibility
- offerId: string | null
- offerName: string | null
- offerType: string | null
- calculationVersion: string | null
- inputJson: jsonb (KPIInput)
- resultJson: jsonb (KPIResult)
- warningsJson: jsonb (string[])

---

### KPIInput (JSON)

> All numeric fields are assumed to be **per selected period** unless explicitly labeled otherwise.

Required
- period: Period
- businessModel: BusinessModel

### OfferInput (JSON, v2)

Required
- offerId: string
- offerName: string
- offerType: "subscription"  // first supported v2 type
- analysisPeriod: Period
- revenuePerPeriod: number (>= 0)
- grossMargin: number (0..1)
- marketingSpendPerPeriod: number (>= 0)
- newCustomersPerPeriod: number (>= 0)
- activeCustomersStart: number (>= 0)

Subscription-specific
- churnedCustomersPerPeriod: number (>= 0), optional if retained count provided
- retainedCustomersFromStartAtEnd: number (>= 0), optional if churned count provided

Common inputs (v1 minimal set)
- revenuePerPeriod: number (>= 0)
- grossMargin: number (0..1)  // 0.7 = 70%
- marketingSpendPerPeriod: number (>= 0)
- newCustomersPerPeriod: number (>= 0)
- activeCustomersStart: number (>= 0)
- activeCustomersEnd: number (>= 0)

Model-specific
- subscription:
  - churnedCustomersPerPeriod: number (>= 0)  // used to compute churnRate
- transactional:
  - retentionRatePerPeriod: number (0..1)      // repeat/retention proxy
- hybrid:
  - may include both; service should warn if insufficient to compute LTV reliably

Optional (later)
- arpcOverride: number (>= 0)  // if user wants to input ARPC directly instead of revenue/customers
- maxCustomerCapacity: number (>= 0) // for "Customers at Max Revenue" / max revenue projections

---

### KPIResult (JSON)

Core computed metrics
- cac: number | null
- ltgp: number | null
- ltgpToCacRatio: number | null
- growthAssessment: number | null  // same value as ltgpToCacRatio
- churnRate: number | null
- ltv: number | null
- arpc: number | null
- car: number | null

Capacity / hypothetical metrics (dependent on available inputs)
- customersAtMaxRevenue: number | null
- hypotheticalMaxRevenuePerYear: number | null
- hypotheticalMaxProfitPerYear: number | null

Diagnostics
- computedAt: datetime (optional)
- assumptions: string[] (optional)

---

### KPI calculation contract (service boundary)

Input: KPIInput
Output:
- results: KPIResult
- warnings: string[]

Warnings should cover:
- denominator <= 0 (e.g., CAC=0, churnRate=0, retentionRate=1)
- extreme outputs (e.g., churnRate < 0.5% creating huge LTV)
- hybrid model missing necessary model-specific fields
- inconsistent customer counts (end > start + new - churned, etc.) (later)
