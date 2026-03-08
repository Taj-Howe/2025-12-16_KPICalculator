# AI Implementation Plan

## Summary

AI should sit on top of deterministic business math, not replace it.

The implementation order should be:

1. deterministic scoring
2. deterministic ranking
3. deterministic health classification
4. AI explanation
5. AI onboarding guidance
6. AI imported-data inference assistance

This keeps the product explainable and avoids invented recommendations.

## AI Jobs to Support

### 1. Recommendation Summary

Input:

- ranked deterministic opportunities
- baseline KPI snapshot
- warnings
- assumptions

Output:

- what is working
- what is weak
- best next move
- expected upside
- caveats

### 2. Health Interpretation

Input:

- LTGP:CAC
- payback
- churn / retention
- margin quality
- imported-data completeness

Output:

- healthy
- needs work
- at risk

This classification should be deterministic first. AI explains it.

### 3. Onboarding Guidance

Input:

- industry preset
- selected offer type
- answers collected so far
- missing required inputs

Output:

- next best question
- why it matters
- whether enough data exists to compute a first result

### 4. Imported-Data Offer Inference Review

Input:

- suggested offer lines
- supporting evidence
- confidence
- unmapped products / prices

Output:

- concise explanation of why the system suggested each offer structure
- where confidence is high
- where the user needs to confirm or split / merge offers

## Non-Negotiable Rules

AI must not:

- invent KPI values
- invent a winning scenario
- override deterministic ranking
- hide missing data
- present weak imported-data inference as fact

AI may:

- summarize deterministic outputs
- explain confidence and caveats
- rewrite recommendations into plain language
- sequence onboarding prompts

## Implementation Phases

## Phase 1: Health Scoring Contract

Build deterministic health classification.

Inputs:

- `LTGP:CAC`
- `cacPaybackPeriods`
- `churnRate` / `retentionRate`
- `observableGrossMargin` where imported
- data completeness / warnings

Outputs:

- `healthStatus`
- `healthReasons`
- `thresholdVersion`

`LTGP:CAC` should carry the highest weight.

## Phase 2: Recommendation Contract

Use the existing ranked opportunity engine.

Outputs:

- best move
- why that move won
- expected impact
- confidence

This can ship with fallback text before any provider integration.

## Phase 3: Onboarding Assistant

Add a guided assistant for one-offer setup.

Use deterministic rules for:

- required next field
- template-specific prompts
- missing-data gates

AI rewrites prompts into better user language.

## Phase 4: Imported-Data Inference Assistant

Add an assistant for reviewing inferred offer lines.

The assistant explains:

- why a line looks like subscription vs hybrid vs pilot
- what evidence supports the guess
- what should be confirmed manually

## Phase 5: Portfolio / Multi-Offer Assistant

Only after single-offer flows are stable:

- compare offers
- identify strongest / weakest line
- explain concentration risk

## Technical Architecture

### Deterministic Layer

Source of truth:

- KPI engine
- scenario engine
- health scoring
- imported-data inference

### AI Layer

Consumes:

- deterministic outputs
- structured context

Produces:

- explanations
- user-facing summaries
- onboarding prompt language

## Safety Boundaries

Every AI response should carry:

- baseline source
- recommendation source
- confidence
- assumptions

If confidence is low or data is incomplete, AI should say so directly.

## Suggested Build Order

1. health threshold spec + deterministic classifier
2. recommendation UI using fallback summary
3. onboarding flow with deterministic prompt sequencing
4. AI rewrite layer for onboarding and recommendation copy
5. imported offer-inference explanation layer
