# Software Onboarding And Health Scoring

## Summary

The first onboarding release should focus on one software offer at a time and
should ship in two layers:

1. deterministic health scoring
2. guided onboarding flow on top of that score

This keeps the result screen explainable before the full question-by-question
experience is built.

## Goals

- tell the operator whether the current offer looks healthy, needs work, or is at risk
- weight the outcome heavily toward `LTGP:CAC`
- surface the best next move from the existing deterministic scenario engine
- keep the logic stable enough that AI only explains it, not invents it

## Non-Goals

- full natural-language onboarding assistant in the first pass
- multi-offer portfolio health
- provider-specific scoring rules

## Health Output Contract

```ts
type HealthStatus = "healthy" | "needs_work" | "at_risk" | "insufficient_data";

type HealthSignal = {
  metric: "ltgpToCacRatio" | "cacPaybackPeriods" | "churnRate" | "grossMarginProxy";
  label: string;
  value: number | null;
  normalizedScore: number | null;
  weight: number;
  contribution: number | null;
  status: "strong" | "acceptable" | "weak" | "missing";
  explanation: string;
};

type HealthAssessment = {
  version: "health-v1";
  status: HealthStatus;
  score: number | null; // 0-100
  weightedSignalCoverage: number; // 0-1
  headline: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  signals: HealthSignal[];
  thresholdVersion: "software-health-v1";
};
```

## Health Signals

The first version should score these signals:

1. `LTGP:CAC`
2. `CAC payback`
3. `Churn`
4. `Gross margin proxy`

### Weighting

The weighting must bias strongly toward `LTGP:CAC`.

Recommended weights:

- `LTGP:CAC`: `0.5`
- `CAC payback`: `0.25`
- `Churn`: `0.15`
- `Gross margin proxy`: `0.10`

If a signal is unavailable, its weight should be removed from the denominator.

## Signal Thresholds

### LTGP:CAC

- `>= 5.0`: strong
- `>= 3.0`: acceptable
- `>= 2.0`: weak
- `< 2.0`: at-risk

### CAC Payback Periods

- `<= 3`: strong
- `<= 6`: acceptable
- `<= 12`: weak
- `> 12`: at-risk

### Churn Rate

This applies only when churn exists.

- `<= 0.03`: strong
- `<= 0.07`: acceptable
- `<= 0.12`: weak
- `> 0.12`: at-risk

### Gross Margin Proxy

Use:

```ts
grossMarginProxy =
  results.ltv != null &&
  results.ltgpPerCustomer != null &&
  results.ltv > 0
    ? results.ltgpPerCustomer / results.ltv
    : null;
```

Thresholds:

- `>= 0.8`: strong
- `>= 0.65`: acceptable
- `>= 0.45`: weak
- `< 0.45`: at-risk

## Status Rules

### Healthy

Use `healthy` when:

- weighted score is `>= 75`
- and `LTGP:CAC >= 3`
- and payback is not at-risk

### Needs Work

Use `needs_work` when:

- weighted score is `>= 45` and `< 75`
- or `LTGP:CAC` is between `2` and `3`

### At Risk

Use `at_risk` when:

- weighted score is `< 45`
- or `LTGP:CAC < 2`
- or payback is `> 12`

### Insufficient Data

Use `insufficient_data` when:

- no weighted signals are available
- or `LTGP:CAC` is missing and fewer than two other weighted signals exist

## Recommendation Layer

The best-next-move card should use the existing deterministic ranking pipeline:

1. build `AnalysisReport`
2. read `bestOpportunity`
3. build fallback summary from `analysis-ai.ts`

The first release should use the deterministic fallback narrative. Provider AI
can rewrite the copy later.

## UI Surface

The first onboarding/health release should appear in the current scenario output.

It should show:

- health status
- health score
- one-sentence health summary
- top strengths
- top weaknesses
- best next move

This is the correct first step before building the full guided onboarding flow.

## Guided Onboarding Follow-On

After the health summary exists, the onboarding flow should ask one question at
a time for the currently selected industry and offer type.

The software-first onboarding flow should:

1. select industry
2. select offer type
3. ask for price / revenue mode
4. ask for churn / retention path
5. ask for CAC path
6. ask for gross profit path
7. show results + health + recommendation

## Suggested Build Order

1. implement `health.ts`
2. add tests for thresholds and weighting
3. surface a health summary card in the current scenario output
4. reuse deterministic best-opportunity output for recommendation copy
5. build the step-by-step onboarding flow on top of the same contract
