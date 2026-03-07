# Calculation Lock v1

This document locks the current KPI math behavior for legacy `businessModel` inputs.

## Scope

- Inputs validated by `kpiInputSchema` in `src/features/kpi/schema.ts`
- Formulas in `src/features/kpi/formulas.ts`
- Orchestration and warnings in `src/features/kpi/service.ts`

All values are interpreted in a single selected analysis period (`monthly`, `quarterly`, `yearly`).

## Formula Contract

| Metric | Equation | Guard / Null rule |
|---|---|---|
| `periodsPerYear` | monthly=`12`, quarterly=`4`, yearly=`1` | fallback `1` |
| `averageActiveCustomers` | `(start + end) / 2` | `0` if both `start` and `end` are `0` |
| `arpc` | `revenuePerPeriod / avgActiveCustomers` | `null` if denominator `<= 0` |
| `cac` | `marketingSpendPerPeriod / newCustomersPerPeriod` | `null` if denominator `<= 0` |
| `churnRate` (subscription) | `churnedCustomersPerPeriod / activeCustomersStart` | `null` if churn missing, negative, or `activeCustomersStart <= 0` |
| `churnedFromStart` | `activeCustomersStart - retainedCustomersFromStartAtEnd` | `null` when invalid cohort values |
| `transactionalChurnRate` | `1 - retentionRatePerPeriod` | `null` when retention missing |
| `ltvSubscription` | `(arpc * grossMargin) / churnRate` | `null` if `arpc`/`churnRate` invalid or `churnRate <= 0` |
| `ltvTransactional` | `(arpc * grossMargin) / (1 - retentionRate)` | `null` if retention missing or `retentionRate >= 1` |
| `ltgpPerCustomer` | `ltv` | passthrough |
| `ratioLtgpToCac` | `ltgpPerCustomer / cac` | `null` if numerator/denominator missing or `cac <= 0` |
| `cacPaybackPeriods` | `cac / (arpc * grossMargin)` | `null` when denominator `<= 0` |
| `annualizedRevenue` | `revenuePerPeriod * periodsPerYear(period)` | always numeric |
| `annualizedProfit` | `((revenuePerPeriod * grossMargin) - marketingSpendPerPeriod) * periodsPerYear(period)` | always numeric |
| `car` | `newCustomersPerPeriod` | passthrough |

## Model Behavior

### Subscription

- Requires either:
  - `retainedCustomersFromStartAtEnd`, or
  - `churnedCustomersPerPeriod`
- Derived churn precedence:
  - Use retained-from-start if provided, otherwise churned input
- Derived end customers:
  - `derivedEndCustomers = activeCustomersStart + newCustomersPerPeriod - derivedChurned`
- ARPC customer denominator:
  - Uses average of start and derived end customers when available
  - Falls back to start customers only when derived end cannot be computed

### Transactional

- Requires `retentionRatePerPeriod`
- Requires `activeCustomersEnd`
- Churn is computed as `1 - retentionRatePerPeriod`

### Hybrid

- Requires `activeCustomersEnd`
- Tries both subscription-derived and transactional-derived paths
- Uses subscription metrics when subscription data exists; otherwise transactional metrics

## Validation Errors (hard failures)

- Subscription missing both retained and churned customer inputs
- Retained customers from start greater than start customers
- Churned customers greater than start customers
- Transactional missing retention rate
- Transactional/hybrid missing active customers at end

## Warning Rules

- `cacPaybackPeriods > 12`: `"Payback is long; growth may be cash constrained."`
- Subscription churn `< 0.5%`: `"Churn is very low; LTV may be inflated."`
- Transactional retention `> 98%`: `"Retention is very high; LTV may be inflated."`
- Missing CAC denominator: `"CAC cannot be computed (newCustomersPerPeriod is 0)."`
- Missing LTGP:CAC denominator: `"LTGP:CAC cannot be computed (CAC is 0)."`
- Hybrid missing subscription retention data: `"Hybrid: subscription retention missing; subscription churn not computed."`
- Hybrid missing transactional retention data: `"Hybrid: transactional retention missing; transactional churn not computed."`

## Golden Lock

Golden fixtures live under `tests/golden/calculation-lock-v1/`.
`tests/kpi.golden-lock.test.ts` enforces deterministic parity for:

- `subscription-retained`
- `subscription-churned`
- `transactional-standard`
- `hybrid-transactional-fallback`
