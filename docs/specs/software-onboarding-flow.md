# Software Onboarding Flow

## Summary

The first onboarding release should live inside the existing offer workspace and
should reuse the current software offer engine, health scoring, and result
surfaces.

This is not a chatbot. It is a guided setup mode that asks one focused question
cluster at a time, keeps the number of visible controls low, and then routes the
user into the existing result view.

## Goals

- get a first-time user to a valid result for one software offer quickly
- keep the flow compatible with the existing supported software offer types
- reuse the current deterministic health and recommendation layers
- preserve a manual mode for operators who already know the model

## Non-Goals

- multi-offer onboarding
- non-software industries
- AI-generated questions in the first pass
- replacing the full manual form

## Entry Point

The offer workspace gets a top-level mode switch:

- `Guided setup`
- `Manual inputs`

`Guided setup` should be the default for first-time users. `Manual inputs`
remains available for advanced users.

## Flow Structure

The onboarding flow should operate on the same `KPIInputState` shape used by the
manual form.

### Step 1: Offer Setup

Purpose:
- establish the software industry path and selected offer type

Fields:
- industry selector (software only actionable)
- offer model
- offer name
- offer ID
- analysis period

Completion rule:
- selected offer type must be supported
- offer name and offer ID must be non-empty

### Step 2: Revenue Model

Purpose:
- capture how the offer makes money

Fields by offer type:

`software_subscription`
- revenue mode
- direct ARPC or total revenue
- starting customer base if required

`software_paid_pilot`
- pilot fee per new customer

`software_token_pricing`
- usage units per customer per period
- price per usage unit
- starting customer base

`software_hybrid_platform_usage`
- platform fee per customer per period
- usage units per customer per period
- price per usage unit
- starting customer base

`software_implementation_plus_subscription`
- recurring ARPC
- implementation fee per new customer
- starting customer base

Completion rule:
- revenue inputs required by the selected offer type must be present

### Step 3: Retention / Throughput

Purpose:
- capture whether value is recurring and how fast customers are added or lost

Fields:

Recurring offers:
- new customers per period
- retention mode
- direct churn rate OR retained/churned cohort counts

Throughput-only offers:
- new customers per period

Completion rule:
- recurring offers must satisfy the current evaluator validation path
- throughput offers need only `newCustomersPerPeriod`

### Step 4: Acquisition

Purpose:
- capture how much it costs to win a customer

Fields:
- CAC mode
- direct CAC OR customer acquisition spend

Completion rule:
- CAC path required by the selected offer type must be valid

### Step 5: Gross Profit

Purpose:
- capture gross profit in the cleanest available way

Fields by offer type:

Recurring margin path:
- gross margin OR delivery costs

Pilot path:
- pilot gross margin OR pilot delivery cost per new customer

Implementation path:
- recurring gross margin path
- implementation gross margin OR implementation delivery cost per new customer

Completion rule:
- gross profit path required by the selected offer type must be valid

### Step 6: Review And Run

Purpose:
- show a concise summary before calculation

Surface:
- offer type
- core revenue driver
- acquisition driver
- retention driver
- gross profit driver

Actions:
- `Back`
- `Run scenario`

On success:
- execute the existing calculate flow
- route the user to `Reports`
- land on the current result view with health summary and best-next-move output

## Validation Strategy

Do not duplicate calculator validation rules manually.

The onboarding flow should:
- do light per-step completeness checks for button enablement
- rely on the existing `/api/kpi/calculate` path for full validation

If the server rejects the payload:
- show the error inline in the review step
- keep the user in guided mode
- do not silently switch them to the manual form

## Component Shape

Recommended components:

- `OnboardingModeSwitch`
- `SoftwareOnboardingFlow`
- `OnboardingStepShell`
- `OnboardingProgress`
- `OnboardingReviewCard`

Recommended page wiring:

- `OfferWorkspace`
  - mode switch
  - guided flow OR manual form
- `page.tsx`
  - if guided flow completes successfully, switch workspace tab from
    `offer_inputs` to `reports`

## UX Rules

- one main question cluster per step
- no giant forms inside guided mode
- show progress clearly
- preserve the dark dashboard style
- keep copy operator-focused, not marketing-heavy

## Suggested Build Order

1. add onboarding mode state in the workspace
2. implement the guided step shell and progress indicator
3. wire offer setup step
4. wire offer-specific revenue / retention / acquisition / margin steps
5. wire review step to the existing calculate flow
6. auto-route successful guided runs to `Reports`
7. verify guided and manual modes both remain usable
