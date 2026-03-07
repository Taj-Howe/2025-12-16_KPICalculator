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

## Next Task
- [x] Add flexible unit-economics inputs to subscription offers.
- [x] Support direct CAC as an alternative to marketing spend / new customers.
- [x] Support delivery-cost-based gross profit as an alternative to direct gross margin.
- [x] Update the offer UI to switch between top-down and unit-economics inputs.
- [x] Add tests for direct CAC and delivery cost scenarios.

## Future Exploration
- [ ] Figure out how to expose this as an API/integration surface so CRMs can plug in and generate reports automatically.
