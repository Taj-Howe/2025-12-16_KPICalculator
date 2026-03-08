# Industry Rollout Plan

## Summary

The product should expand to other business types through an **offer-first engine**
with **industry-specific onboarding and templates**, not by cloning the KPI engine
for every vertical.

The rollout sequence should be:

1. `Software / Tech`
2. `E-commerce`
3. `Online Education`
4. `Service Businesses`

That order is driven by:

- existing product maturity
- quality of importable payments data
- ease of mapping monetization models into current KPI math
- risk of ambiguous or misleading onboarding

## Core Principle

The engine stays centered on:

- offer structure
- acquisition
- gross profit
- churn / retention
- payback
- LTGP:CAC

Industries add:

- template defaults
- onboarding question flow
- health thresholds
- imported-data inference rules
- recommendation framing

Industries should **not** introduce separate KPI engines unless the current math
cannot express the offer structure honestly.

## Shared Product Architecture

Every industry rollout must ship the same five layers:

### 1. Industry Preset

The industry selector controls:

- available offer templates
- onboarding copy
- staged / supported state
- import heuristics

### 2. Offer Templates

Each industry should expose a constrained set of offer models.

Templates must map into the offer engine cleanly and must not require hidden
fields the onboarding flow cannot actually collect.

### 3. Onboarding Flow

Each industry gets a guided setup for **one product / offer first**.

The onboarding flow should:

- ask one question at a time
- adapt questions to the selected offer template
- minimize jargon
- end on a result and recommendation screen

### 4. Health Model

Each industry needs thresholds for:

- healthy
- needs work
- at risk

These thresholds should be weighted heavily toward:

- `LTGP:CAC`
- payback
- churn / retention
- margin quality

### 5. Imported-Data Support

Each industry rollout must define:

- what can be inferred from payments data alone
- what needs accounting data
- what still requires manual confirmation

No industry should launch with “automatic” insights unless the confidence model
and user confirmation step are in place.

## Phase 1: Software / Tech

### Status

Current primary path. This is the reference implementation for the broader
industry rollout.

### Supported offer templates

- `software_subscription`
- `software_paid_pilot`
- `software_token_pricing`
- `software_hybrid_platform_usage`
- `software_implementation_plus_subscription`

### Required next work

- software onboarding flow
- software health thresholds
- auto-generated recommendation surface in-product
- import-to-offer inference from Stripe/accounting data

### Imported-data heuristics

Signals that should drive software offer inference:

- recurring invoice cadence
- customer overlap across recurring lines
- quantity-based usage charges
- large upfront fee followed by recurring smaller charges
- refund rate by product / price

### Exit criteria

Software is “mature enough” when:

- onboarding is usable end-to-end for one offer
- health scoring exists
- best-next-action recommendation is visible
- imported snapshot and offer inference are available with confirmation

## Phase 2: E-commerce

### Why next

E-commerce is the best second industry because payment data is usually cleaner
than service businesses, and the offer shapes are easy to reason about.

### Initial offer templates

- one-time product
- repeat-purchase product
- subscription / replenishment offer
- bundle / average-order-value-driven offer

### Core metrics emphasis

- LTGP:CAC
- payback
- AOV
- repeat purchase rate
- gross margin
- refund rate

### Imported-data requirements

Payments data should be able to provide:

- product-level revenue concentration
- refund behavior
- repeat purchase counts
- order frequency

Accounting integration becomes important for:

- fulfillment cost
- COGS quality
- processor-fee drag

### Manual confirmation still required

- product family grouping
- which products should be treated as one offer line
- bundle vs standalone relationship

### Exit criteria

- one-time and repeat-purchase templates implemented
- onboarding flow asks e-commerce-specific questions
- imported snapshot can suggest product lines
- health scoring reflects repeat behavior and refund drag

## Phase 3: Online Education

### Why third

Online education overlaps with software and services, but upsells and cohort
behavior make it slightly more ambiguous than e-commerce.

### Initial offer templates

- one-time course
- cohort-based program
- membership / recurring community
- certification / upsell ladder

### Core metrics emphasis

- LTGP:CAC
- refund rate
- upsell conversion
- membership retention
- payback

### Imported-data requirements

Payments data should support:

- one-time vs recurring separation
- order path sequencing
- upsell relationship hints

Manual confirmation likely needed for:

- whether a product line is part of one ladder
- whether cohort programs should be treated as one-time or recurring-like

### Exit criteria

- education templates are implemented honestly
- onboarding reflects course / membership language
- recommendations account for refund and upsell dynamics

## Phase 4: Service Businesses

### Why last

Service businesses often have the messiest mapping between revenue, delivery
cost, labor, and churn, so they should ship last.

### Initial offer templates

- retainer
- project-based engagement
- implementation / setup fee
- recurring service plan

### Core metrics emphasis

- LTGP:CAC
- payback
- delivery margin
- utilization / capacity pressure
- churn / retention

### Imported-data requirements

Payments data can show:

- recurring client billing
- project fee patterns
- invoice timing

But accounting and manual inputs are usually required for:

- delivery labor
- true gross profit
- capacity constraints

### Exit criteria

- service-specific gross profit inputs are honest
- onboarding handles labor-heavy economics clearly
- imported-data insights are not overstated when labor data is missing

## Release Rules

An industry should not move from staged to supported until all of the following
exist:

1. At least one fully implemented offer template.
2. A guided onboarding flow for one offer at a time.
3. Health thresholds with explicit labels.
4. Recommendation output built on deterministic analysis.
5. Imported snapshot support with clear confidence rules.

If any of those are missing, the industry should stay visible but staged.

## Recommendation Layer Rules

The same analysis pipeline should power every industry:

1. calculator math
2. deterministic scenario engine
3. ranked opportunities
4. AI summary on top

AI should never choose a winning lever independently of deterministic ranking.

## Suggested Implementation Order

1. Finish software onboarding and health grading.
2. Build imported offer inference for software.
3. Add e-commerce templates and onboarding.
4. Add imported e-commerce line inference.
5. Add online education templates and onboarding.
6. Add service business templates only after delivery-cost modeling is ready.

## Product Constraints

- One offer first, portfolio later.
- Keep the industry selector honest: supported vs staged.
- Keep `LTGP:CAC` as the dominant health signal across industries.
- Do not expand the UI selector faster than the underlying onboarding and math.
