# Offer-Based KPI Refactor - Execution Tracker

## Plan
- [x] Create `docs/specs/calculation-lock-v1.md` with formula/validation/warning contract.
- [x] Add golden fixtures under `tests/golden/calculation-lock-v1/*.json`.
- [x] Add golden test runner that verifies deterministic outputs.
- [x] Introduce Offer v2 types in `src/features/kpi/types.ts`.
- [x] Add v1/v2 schemas + input adapters for backward compatibility.
- [x] Refactor KPI service into offer/legacy evaluators with a unified envelope.
- [x] Update calculate and reports APIs for v1/v2 payloads + `calculationVersion` + `assumptionsApplied`.
- [x] Replace UI “Business Model” control with Offer-first controls (subscription-first, other types disabled).
- [x] Add DB migration + schema columns for offer metadata and calculation version.
- [x] Add regression tests for v1 lock parity.
- [x] Add tests for v2 subscription offer evaluation and API shape.
- [x] Update docs language to “Offer” / “Offer Portfolio”.

## Review
- Added an executable v1 math lock via spec + golden fixtures.
- Preserved legacy `businessModel` payload support while introducing v2 subscription-offer inputs.
- Persisted `offerId`, `offerName`, `offerType`, and `calculationVersion` metadata for new reports.
- Reworked the home input flow to model one subscription offer at a time.
- Verification completed with `npm test`, `npm run lint`, and `npm run build`.

## Flexible Subscription Inputs
- [x] Add flexible unit-economics inputs to subscription offers.
- [x] Support direct CAC as an alternative to marketing spend / new customers.
- [x] Support delivery-cost-based gross profit as an alternative to direct gross margin.
- [x] Update the offer UI to switch between top-down and unit-economics inputs.
- [x] Add tests for direct CAC and delivery cost scenarios.

## Review
- Added direct CAC and delivery-cost-driven gross profit paths to the subscription offer flow.
- Kept backward compatibility for business-metrics mode while opening a true unit-economics path.
- Verification completed with `npm test`, `npm run lint`, and `npm run build`.

## Churn Input Fix
- [x] Fix unit-economics churn rate percent entry so the input stores decimals correctly.
- [x] Add regression coverage for percent parse/display helpers used by churn and margin fields.
- [x] Verify with `npm test`, `npm run lint`, and targeted build/test coverage.

## Review
- Fixed the unit-economics churn input so percent-form values are stored as decimals instead of being multiplied again on re-render.
- Added shared percent helpers for parsing and display to keep churn and gross-margin inputs consistent.
- Verification completed with `npm test`, `npm run lint`, and `npm run build`.

## Projection Fix
- [x] Use unit-economics inputs to project annual revenue/profit instead of returning `-`.
- [x] Add regression tests for annual projection with direct ARPC, churn rate, and sales velocity.
- [x] Verify with `npm test`, `npm run lint`, and `npm run build`.

## Review
- Unit-economics mode now projects annual revenue and profit from direct ARPC, churn rate, sales velocity, and optional starting customers.
- The projection simulates each period in the analysis year instead of requiring `revenuePerPeriod`.
- Verification completed with `npm test`, `npm run lint`, and `npm run build`.

## Metric Split
- [x] Split steady-state hypothetical-max metrics from 12-month projection metrics.
- [x] Implement transcript-aligned hypothetical-max customers/revenue/profit formulas for subscription offers.
- [x] Update UI, reports, and comparison views to use honest labels for projection vs steady-state outputs.
- [x] Add regression coverage and verify with `npm test`, `npm run lint`, and `npm run build`.

## Review
- Subscription offers now report steady-state hypothetical max separately from next-year projected revenue/profit.
- Added `hypotheticalMaxCustomers`, `projectedRevenueNextYear`, and `projectedProfitNextYear` to the shared KPI result envelope.
- Updated result panels, report comparison, and trends/report series to surface the split cleanly while preserving legacy lock behavior.
- Verification completed with `npm test`, `npm run lint`, and `npm run build`.

## Software/Tech Taxonomy
- [x] Specialize the offer system for software/tech monetization models instead of generic business categories.
- [x] Define the software/tech offer taxonomy and shared revenue-component model in code.
- [x] Make `software_subscription` a first-class offer type while keeping legacy `subscription` compatibility.
- [x] Reserve paid pilot, pilot-to-subscription, token pricing, hybrid, and implementation-based offers as defined but not yet implemented.
- [x] Move defaults and sample data onto a software subscription preset.
- [x] Add docs/tests and verify with `npm test`, `npm run lint`, and `npm run build`.

## Review
- Added a dedicated software/tech taxonomy spec and code model for monetization types and revenue components.
- `software_subscription` now runs through the existing subscription evaluator with required software metadata.
- The UI defaults and staged offer selector now point at software-native models instead of generic offer categories.
- Verification completed with `npm test`, `npm run lint`, and `npm run build`.

## UI Regression Fix
- [x] Restore Hormozi-style software subscription framing in the form.
- [x] Make sales velocity, churn, LTGP:CAC, and payback the obvious center of the software subscription experience.
- [x] Keep software taxonomy metadata under the hood instead of making the current form feel more complex.
- [x] Verify with `npm test`, `npm run lint`, and `npm run build`.

## Review
- Restored the simple user-facing framing around sales velocity, churn, CAC, and LTGP while keeping software offer taxonomy in the data model.
- Reordered the results panel so the core growth math appears first instead of being buried behind generic KPI labels.
- Verified the branch with `npm test`, `npm run lint`, and `npm run build`.

## Future Exploration
- [ ] Figure out how to expose this as an API/integration surface so CRMs can plug in and generate reports automatically.
- [ ] Make API/payment integration a one-click setup so the app can automatically analyze Stripe or another payments dashboard.
- [ ] Rework the home experience around a software/tech offer picker before the broader UI redesign.
- [ ] Implement the larger UI refresh after the offer taxonomy is stable:
  - Radix Themes
  - dark-mode fintech visual system
  - hero graph for projected revenue growth
  - cleaner results hierarchy for projection vs steady-state outputs
- [ ] Build the next software/tech offer set in this order:
  - paid pilot
  - token-priced AI product
  - hybrid platform + usage
  - implementation + subscription

## Current Fintech UI Refresh
- [x] Write the fintech UI refresh spec and lock the page architecture before implementation.
- [x] Install and theme Radix so the app has a reusable dark-mode design system.
- [x] Rebuild the home screen shell around a hero section and stronger workspace/dashboard surfaces.
- [x] Add a minimal hero graph that visualizes projected growth / steady-state upside.
- [x] Add a top-level workspace selector so the page can switch between Offer Inputs and Reports.
- [x] Make the hero graph use live offer inputs and add a selector for revenue, profit, and customer views.
- [ ] Fix the calculator field primitives so inputs and selects render as explicit styled controls in the new dark UI.
- [ ] Group KPI outputs into unit economics, steady-state ceiling, and next-year projection cards.
- [ ] Redesign the reports/trends area to match the new visual system.
- [ ] Run mobile, lint, test, and build verification before merging.

## Review
- Added Radix Themes at the app shell level and established the first dark-mode fintech token layer.
- Reworked the page shell so the hero, calculator workspace, save panel, and reports surface read as one product instead of a bare utility layout.
- Added a new hero section and projection chart that can render current, projected, and ceiling revenue context from the existing evaluation model.
- Replaced the static hero interpolation with a live subscription forecast that updates directly from the current form inputs and can switch between revenue, profit, and customer views.
- Extracted shared subscription forecast math so the chart and evaluator use the same projection logic instead of drifting apart.
- Verified the phase with `npm test`, `npm run lint`, and `npm run build`.

## Component Build Plan
- [x] `src/components/home/HeroSection.tsx`
- [x] `src/components/home/ProjectionHeroChart.tsx`
- [x] `src/components/home/WorkspaceViewSelector.tsx`
- [ ] `src/components/home/OfferWorkspace.tsx`
- [ ] `src/components/home/OfferModeSwitch.tsx`
- [ ] `src/components/home/OfferTypePills.tsx`
- [ ] `src/components/home/DecisionCards.tsx`
- [ ] `src/components/home/ResultsSections.tsx`
- [ ] `src/components/home/SaveReportCard.tsx`
- [ ] `src/components/home/ReportsDashboard.tsx`
