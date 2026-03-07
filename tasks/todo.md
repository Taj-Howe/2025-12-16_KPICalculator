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

## Next Phase Plan
- [x] Specialize the offer system for software/tech monetization models instead of generic business categories.
- [ ] Define a staged software/tech taxonomy:
  - `subscription_seat_based`
  - `subscription_usage_based`
  - `subscription_hybrid`
  - `pilot_paid`
  - `pilot_to_subscription`
  - `token_pricing`
  - `token_plus_platform_fee`
  - `implementation_plus_subscription`
  - `transaction_fee`
- [ ] Design a shared revenue-engine model that can express:
  - recurring platform fees
  - seat counts and seat price
  - usage volume and unit price
  - token cost and token sell-through price
  - pilot fees and conversion into live contracts
  - onboarding / implementation fees
  - transaction-based monetization
- [ ] Decide which outputs are universal across software/tech offers and which are offer-type-specific.
- [ ] Build the first software/tech offer set in this order:
  - paid pilot
  - subscription SaaS
  - token-priced AI product
  - hybrid platform + usage
- [ ] Add software-specific input language:
  - seats
  - active accounts
  - workspace/org count
  - pilot conversion rate
  - token usage and token gross margin
  - onboarding / implementation effort
- [ ] Separate core metrics into:
  - unit economics
  - steady-state max
  - next-year projection
  - offer conversion funnel where relevant
- [ ] Rework the home experience around a software/tech offer picker before the broader UI redesign.
- [ ] Implement the larger UI refresh after the offer taxonomy is stable:
  - Radix Themes
  - dark-mode fintech visual system
  - hero graph for projected revenue growth
  - cleaner results hierarchy for projection vs steady-state outputs

## Current Software/Tech Taxonomy
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

## Current UI Regression Fix
- [x] Restore Hormozi-style software subscription framing in the form.
- [x] Make sales velocity, churn, LTGP:CAC, and payback the obvious center of the software subscription experience.
- [x] Keep software taxonomy metadata under the hood instead of making the current form feel more complex.
- [x] Verify with `npm test`, `npm run lint`, and `npm run build`.

## Review
- Restored the simple user-facing framing around sales velocity, churn, CAC, and LTGP while keeping software offer taxonomy in the data model.
- Reordered the results panel so the core growth math appears first instead of being buried behind generic KPI labels.
- Verified the branch with `npm test`, `npm run lint`, and `npm run build`.
