# Dashboard Analytics Evolution

## Summary

The dashboard should evolve from a clean MVP into a denser operating surface
that still feels restrained. The target is not a BI tool. The target is a
decision console.

The dashboard must make it easy to answer:

- Is growth quality improving or deteriorating?
- Which offer is driving the business?
- Is churn or CAC the bigger problem right now?
- Is margin slipping even while revenue grows?
- What is the best next move according to the scenario engine?

## Design Direction

The dashboard should stay:

- dark
- minimal
- text-led
- overlay-heavy instead of card-spam

That means:

- more shared canvases with layered signals
- fewer disconnected charts
- more compact KPI ribbons
- strong visual hierarchy around the one or two things that matter most now

## Core Dashboard Zones

### 1. Forecast Header

Top-level live surface from current manual inputs:

- projected revenue path
- projected profit path
- steady-state ceiling
- current LTGP:CAC
- current payback

This remains the manual-input control surface.

### 2. Imported Business Ribbon

A compact horizontal strip showing imported-data health:

- imported net receipts
- imported active customers
- imported refund rate
- imported observable gross margin
- imported CAC payback
- latest best move

This is the “what is happening now” strip.

### 3. Overlay Trend Canvas

One large shared chart area with view switching.

Views should include:

- revenue vs refunds
- profit vs margin
- churn vs retention
- payback vs LTGP:CAC
- imported trend vs projected path

Each view should put two related signals on one canvas instead of creating more
standalone charts.

### 4. Opportunity Stack

A ranked list of:

- best move
- second-best move
- third-best move

Each opportunity should show:

- lever
- projected upside
- confidence
- key assumption

### 5. Offer Mix / Offer Concentration

For imported data, show:

- top offer contribution
- concentration of revenue by offer
- which offer is weakening or strengthening

This does not need a big chart initially. A compact ranked list is enough.

### 6. Quality / Risk Surface

Compact warnings and drift indicators:

- refund drift
- margin compression
- weak retention signal
- missing CAC data
- missing delivery-cost mapping

This should be clearly separated from the main performance surfaces.

## Overlay Principles

Use overlays only when they answer one decision.

Good overlays:

- revenue and refunds
- profit and margin
- churn and retention
- payback and LTGP:CAC
- imported baseline and modeled projection

Bad overlays:

- unrelated metrics sharing a canvas just to look dense

## Suggested Screen Layout

### Desktop

1. Forecast header
2. Imported business ribbon
3. Main trend canvas
4. Opportunity stack + risk surface in a side rail
5. Offer mix and deeper analytics below

### Mobile

1. Forecast header
2. Imported business ribbon
3. Trend canvas
4. Opportunity stack
5. Risk surface
6. Offer mix

## First Implementation Pass

The first denser dashboard pass should add:

1. imported business ribbon
2. overlay trend canvas with 4 to 5 views
3. opportunity stack beside the trend canvas
4. compact risk surface

Do not add:

- arbitrary mini-charts everywhere
- generic BI filters
- cross-offer drilldowns before single-offer clarity is solid

## Data Sources

### Manual input math

Use:

- current offer input state
- current KPI evaluation
- current scenario ranking

### Imported analytics

Use:

- normalized offer period snapshots
- mapped calculator evaluations
- deterministic analysis report from the latest evaluable imported snapshot

## Release Rules

Every new chart or ribbon must map to a real operator action.

Examples:

- refund trend -> investigate pricing / billing / product issues
- payback drift -> change CAC or front-load cash collection
- margin compression -> inspect delivery costs
- retention drop -> prioritize churn reduction
- top-ranked scenario -> next operator action

If a display does not imply an action, it should not be on the dashboard.
