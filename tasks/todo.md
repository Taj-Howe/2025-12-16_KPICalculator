# KPI Calculator Roadmap

## Current Product Shape
- Single-offer profitability calculator, optimized first for software subscriptions.
- Core math is locked with regression coverage and legacy compatibility.
- Current UI is a dashboard-first dark-mode workflow with live forecast, grouped results, and saved reports.

## Industry Rollout
- [x] Write the phased industry rollout plan in `docs/specs/industry-rollout-plan.md`.
- [ ] Finish the software / tech path first with onboarding, health grading, imported snapshot inference, and in-product recommendations.
- [ ] Ship the first e-commerce path after software is mature, starting with one-time, repeat-purchase, subscription/replenishment, and bundle-oriented offer templates.
- [ ] Ship online education after e-commerce, starting with course, cohort, membership, and upsell-ladder templates.
- [ ] Ship service businesses last, only after labor-heavy delivery-cost modeling and onboarding are honest enough to avoid misleading margin outputs.
- [ ] Keep every staged industry visibly non-actionable until it has at least one real offer template, onboarding, health thresholds, and imported-data support.

## Next Build
- [x] Rework the home experience around a clearer software/tech offer picker.
- [x] Introduce a normalized internal software monetization layer from `docs/specs/software-tech-monetization-engine.md`.
- [x] Refactor `software_subscription` onto the normalized internal layer without changing current outputs.
- [x] Implement `software_paid_pilot` on top of the normalized internal layer.
- [x] Implement `software_token_pricing` on top of the normalized internal layer.
- [x] Implement `software_hybrid_platform_usage` on top of the normalized internal layer.
- [x] Implement `software_implementation_plus_subscription` on top of the normalized internal layer.
- [x] Add regression coverage for each step so legacy math and current `software_subscription` behavior do not drift.

## Intelligence Layer
- [ ] Add an onboarding flow that helps a new user set up one product first: select business type, answer the key questions one by one, then land on results with auto-generated recommendations.
- [x] Add a guided/manual mode switch to the offer workspace so onboarding can coexist with the full operator form.
- [x] Implement a software-first onboarding wizard that reuses the current offer state, asks one focused question per step, and routes completion into the existing results flow.
- [x] Auto-route guided onboarding completion into the `Reports` result view instead of leaving users in the input workspace after the first run.
- [x] Define basic business health thresholds for onboarding and recommendations, weighted heavily toward `LTGP:CAC`, with clear outcomes like `healthy`, `needs work`, or `at risk`.
- [ ] Use the deterministic analysis engine plus AI summary layer to generate the onboarding recommendation output: call out what is working, what is weak, and the best next course of action.
- [ ] Write a concrete AI implementation plan that sequences health scoring, onboarding recommendations, imported-data inference, assistant UX, and safety boundaries.
- [x] Write the software-first onboarding and health scoring spec.
- [x] Implement deterministic health scoring for the current software offer path, weighted heavily to `LTGP:CAC`.
- [x] Surface a health summary and best-next-move recommendation in the current scenario output before the full guided onboarding flow ships.
- [ ] Add AI that analyzes the current offer data, runs improvement scenarios against the existing math, and identifies the single highest-ROI move so the app can surface the lowest-hanging-fruit metric to improve first.
- [ ] Add scenario and sensitivity analysis that shows what happens if the operator increases sales velocity, lowers CAC, lowers churn, improves gross margin, or changes price, so the app can quantify which lever creates the biggest upside before AI summarizes it.
- [ ] Make the scenario/sensitivity layer exportable with a comprehensive dataset, including baseline inputs, baseline outputs, each lever tested, percent and absolute change assumptions, resulting KPI deltas, ranked upside opportunities, AI recommendation summary, and enough structured fields for CSV/API/report consumption.
- [x] Write the spec for deterministic analysis, ranking, and export contracts in `docs/specs/analysis-export-schema.md`.
- [x] Add analysis-layer types for baseline snapshots, scenario definitions, metric deltas, ranked opportunities, and canonical exports.
- [x] Build baseline snapshot generation directly from the existing `KpiEvaluation` contract.
- [x] Implement lever-to-field patch generation for supported software offer types.
- [x] Implement deterministic scenario evaluation for `sales_velocity`, `cac`, `churn`, `gross_margin`, and `price`.
- [x] Implement sensitivity sweeps with percent and absolute change modes.
- [x] Implement KPI delta generation for every `KPIResult` metric.
- [x] Implement deterministic ranking for the best opportunity, defaulting to `projectedProfitNextYear`.
- [x] Implement canonical JSON export and flat scenario-row export from the same analysis report.
- [x] Add AI summary generation only after deterministic ranking exists, using the contract defined in `docs/specs/analysis-export-schema.md`.
- [x] Expand the graph into a richer analytics surface for payments/accounting integrations: trend overlays, cohort movement, payback movement, churn/retention shifts, revenue mix, margin drift, and other decision-making stats that matter when real business data is flowing in automatically.

## Integrations
- [ ] Expose this as an API/integration surface so external systems can generate reports automatically.
- [ ] Make payments/accounting integration a one-click setup so the app can automatically analyze Stripe or another payments/accounting source.
- [ ] Add an immediate imported business snapshot that shows rough health across all revenue items from payments/accounting data before full offer mapping is complete.
- [ ] Add an offer-structure inference layer that suggests likely product lines and monetization models from imported Stripe/accounting patterns.
- [ ] Generate draft calculator-ready offers from imported data, with confidence levels, supporting evidence, and explicit user confirmation before treating them as real offers.
- [ ] Surface automatic insights from imported data and inferred offer structures so the app can show useful recommendations immediately after connect/sync.
- [x] Add a sample Stripe-style import path that seeds normalized snapshots through the real integrations pipeline for local/demo dashboard use.
- [x] Write the payments/accounting integrations spec in `docs/specs/payments-accounting-integrations.md`.
- [x] Add normalized imported-data types for sources, revenue events, refund events, expense events, subscription state, and offer period snapshots.
- [x] Add explicit offer/product/account mapping types so imported data can be tied to one calculator offer at a time.
- [x] Implement deterministic offer-period snapshot derivation for imported payments/accounting data.
- [x] Implement snapshot-to-calculator adapters for supported software offer types.
- [x] Add the internal integrations API surface for sources, mappings, sync runs, snapshots, and calculator-ready suggestions.
- [x] Add the first provider connector on top of the normalized import model after the API surface is stable.
- [ ] Add durable persistence and OAuth/webhook handling for provider connectors after the API-key Stripe path is proven.

## UI Follow-Ups
- [x] Make `Offer Inputs` a wide workspace and keep decision output under `Reports` so the tab structure matches the user workflow more cleanly.
- [ ] Continue polishing the dashboard after the offer taxonomy stabilizes, especially around deeper analytics views and imported-data workflows.
- [x] Add a restrained imported-data analytics panel in `Reports` with decision-first views for revenue, profit, churn/retention, payback, margin drift, and scenario upside.
- [ ] Write a spec for a denser, more layered dashboard with overlay displays driven by live inputs, imported snapshots, trends, and ranked opportunities.
- [x] Fix software offer-model switching so it does not jump the scroll position.
- [x] Replace the software offer-model header with a larger heading and an industry dropdown that stages e-commerce, online education, and service businesses.

## Completed Milestones
- [x] Locked the existing KPI math with a written spec, golden fixtures, and regression tests.
- [x] Shipped the offer-based KPI refactor with backward compatibility for legacy business-model payloads.
- [x] Added flexible subscription inputs: direct CAC, direct ARPC, delivery-cost-based gross profit, and direct churn-rate paths.
- [x] Split steady-state ceiling metrics from next-year projection metrics.
- [x] Specialized the current offer system around software/tech subscriptions and reserved future software monetization models.
- [x] Re-centered the product around Hormozi-style drivers: sales velocity, churn, CAC, LTGP, and payback.
- [x] Rebuilt the home experience into a dashboard UI with a live hero chart, offer workspace, grouped result sections, save snapshot surface, and reports dashboard.

## Latest Review
- The app now behaves like a usable MVP for one software offer at a time.
- The dashboard is wired to live input math instead of static placeholders.
- Reports, trends, and comparison surfaces now match the same dark UI system.
- The software monetization engine now supports token-priced offers with recurring retention, unit-cost delivery math, and acquisition inputs while preserving the existing KPI result shape.
- The software monetization engine now also supports blended platform-fee plus usage-fee offers with recurring retention, steady-state ceiling metrics, and next-year projection using the same shared evaluator.
- The software monetization engine now also supports mixed implementation-plus-subscription offers, with recurring subscription `ARPC` and churn kept separate from one-time implementation contribution in `LTV`, `LTGP`, and annual totals.
- The home workspace now uses a real software/tech offer picker with supported models wired to model-specific inputs, while staged models stay visible without pretending to be implemented.
- The deterministic analysis engine now builds baseline snapshots, scenario patches, KPI deltas, sensitivity sweeps, and ranked opportunities on top of the existing KPI evaluation path, with focused regression coverage.
- The analysis layer now exports a versioned canonical JSON payload and flat per-scenario rows, so the deterministic engine is ready for API/report/CSV consumers without adding UI coupling.
- The AI recommendation layer now sits safely on top of deterministic ranking: providers may rewrite narrative, but the chosen lever, scenario, and expected impact remain locked to the ranked analysis output, with a built-in fallback when no provider is configured.
- The payments/accounting integration path is now specified around normalized imported business data and offer-period snapshots, which keeps Stripe/accounting connectors separate from KPI math and UI state.
- The internal integrations surface now exists with normalized import types, deterministic offer-period snapshot derivation, calculator-input adapters, and authenticated routes for sources, mappings, sync runs, snapshots, and calculator suggestions.
- The first real provider connector is now in place for Stripe using explicit API-key connection plus invoice/refund/subscription normalization, while OAuth, webhook sync, and durable connector persistence remain deferred.
- The reports dashboard now includes a compact imported-data analytics surface built on normalized offer snapshots plus deterministic scenario ranking, so operators can inspect revenue, profit, churn/retention, payback, margin drift, and upside without leaving the main workflow.
- The industry rollout is now sequenced explicitly: software first, then e-commerce, then online education, then services, with onboarding, health scoring, and imported-data support treated as release gates instead of optional polish.
- A sample Stripe-style import path now exists for local/demo use, so the imported analytics dashboard can be populated through the real integrations pipeline without live credentials.
- Software-first health scoring is now implemented with explicit weighted signals for `LTGP:CAC`, payback, churn, and margin quality, and the current scenario output now surfaces health status plus a deterministic best-next-move summary ahead of the full onboarding wizard.
- The offer workspace now supports a software-first guided onboarding flow with a guided/manual mode switch, stepwise setup, and automatic routing into `Reports` after a successful guided run.
- Verification baseline for the current MVP remains `npm test`, `npm run lint`, and `npm run build`.
