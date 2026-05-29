# KPI Calculator Roadmap

## Active Task: Input Priority Highlighting
- [x] Add reusable required/optional field highlighting to the form primitive.
- [x] Mark the key guided/manual setup fields as required and secondary tuning fields as optional.
- [x] Add a small motion cue that makes required startup inputs easy to scan without distracting from the form.
- [x] Verify with `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.

### Active Task Review
- Added reusable `Needed` and `Optional` field badges with a simple color treatment and reduced-motion-safe required-field animation.
- Applied required highlighting to the setup inputs that drive the calculator math: revenue/price, sales velocity, starting customer base, churn, CAC, and gross profit.
- Applied optional highlighting to secondary tuning inputs such as fixed delivery costs, refund rates, optional churn counts, and pricing-explorer manual assumptions.
- Verification passed with `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.

## Concurrent Task: Close-Rate Pricing Signal
- [x] Verify the Hormozi close-rate pricing heuristic and encode it as a deterministic reference, not a hard recommendation.
- [x] Add close-rate and channel-context controls to the Pricing Explorer without changing saved report/API contracts.
- [x] Surface tolerated price-increase guidance beside the existing scenario table, with caveats for cold vs referral-heavy traffic.
- [x] Add focused tests for close-rate tiers and channel-adjusted interpretation.
- [x] Verify with `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.

### Concurrent Task Review
- Confirmed the close-rate pricing ladder from Alex Hormozi's January 13, 2026 business-math episode: 80%+ close rates imply roughly 3-4x underpricing, 60-80% implies 2-3x, 50-60% implies 1.5-2x, 40-50% implies 1.25-1.5x, 30-40% is generally priced about right, and below 30% points to sales motion or market quality first.
- Added a deterministic close-rate pricing signal with channel context for cold, mixed/inbound, and WOM/referral leads.
- Added Pricing Explorer controls for close rate and lead-source context, rendering the heuristic as a caveated signal beside the existing price/churn/sales-velocity scenario table.
- Added regression tests for tier mapping, referral target ranges, and low cold-traffic conversion diagnosis.
- Verification passed with `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.

## Previous Active Task: Pricing Explorer With Churn Tradeoff
- [x] Add a coupled pricing-analysis module with price, churn, and sales-velocity scenario generation.
- [x] Add sensitivity presets plus editable manual assumptions in the current decision output.
- [x] Surface break-even churn thresholds and a best-under-assumptions verdict.
- [x] Contextualize price recommendations with churn/sales-velocity caveats without replacing the existing best-lever ranking.
- [x] Add unit/regression tests for coupled pricing scenarios and existing independent ranking.
- [x] Verify with `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.

### Active Task Review
- Added a dedicated Pricing Explorer that compares price changes against coupled churn and sales-velocity assumptions while leaving saved report/API shapes unchanged.
- Added low/base/high presets plus manual sensitivity inputs, scenario verdicts, break-even churn, and best-under-assumptions highlighting in the decision output.
- Price recommendations now include a base-sensitivity caveat when the independent analysis ranks price as the best next move.
- Verification passed with `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.

## Previous Active Task: Sales Velocity And Base-Customer Logic Repair
- [x] Confirm where software and e-commerce flows collect sales velocity and starting customer base.
- [x] Make sales velocity explicit as new customers per month while preserving the internal per-period field used by CAC and projection formulas.
- [x] Ask for starting active customers in recurring software subscription unit-economics flows.
- [x] Ask paid-pilot guided onboarding for new pilots sold instead of relying on defaults.
- [x] Update result surfaces so sales velocity is displayed as a monthly value, with per-period cohort math still visible where useful.
- [x] Add focused math helper tests for monthly sales velocity conversion.
- [x] Verify with `npm test`, `npm run lint`, and `npm run build`.

### Active Task Review
- Manual software/e-commerce inputs and guided software onboarding now collect monthly sales velocity and convert it to the existing `newCustomersPerPeriod` contract for formulas.
- Software subscription unit-economics mode now asks for starting active customers, and paid-pilot guided onboarding now asks for new pilots sold.
- Decision cards, result customer bridge, and saved-report details now display sales velocity as a monthly value while still showing per-period cohort movement where relevant.
- Verification passed with `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.

## Previous Active Task: Whole-App KPI Math Audit And Repair
- [x] Lock the metric contract in code/docs: LTV is lifetime revenue, LTGP is lifetime gross profit, ARPC is recurring revenue per active customer per selected period.
- [x] Fix shared formula helpers so lifetime revenue and lifetime gross profit are calculated separately.
- [x] Repair legacy, software/tech, e-commerce, mixed-offer, analysis, and import paths that rely on the old LTV/LTGP semantics.
- [x] Update result labels so recurring, one-time, repeat-purchase, and mixed offers do not present one shared metric name with the wrong business meaning.
- [x] Add hand-checkable oracle tests covering every supported calculation family and import mapping semantics.
- [x] Update golden fixtures only after manually verifying the new expected values.
- [x] Verify with `npm test`, `npm run lint`, and `npm run build`.

### Active Task Review
- Implemented the whole-app metric contract: `LTV` now represents lifetime revenue, while `LTGP per customer` remains lifetime gross profit.
- Added oracle coverage for legacy, software/tech, e-commerce, mixed-offer, and imported mixed-offer calculations.
- Updated result labels to avoid presenting one-time and mixed revenue drivers as generic recurring `ARPC`.
- Verification passed with `npm test`, `npm run lint`, and `npm run build`; browser smoke testing was skipped after user direction.

## Current Product Shape
- Single-offer profitability calculator, optimized first for software subscriptions.
- Core math is locked with regression coverage and legacy compatibility.
- Current UI is a dashboard-first dark-mode workflow with live forecast, grouped results, and saved reports.

## Industry Rollout
- [x] Write the phased industry rollout plan in `docs/specs/industry-rollout-plan.md`.
- [ ] Finish the software / tech path first with onboarding, health grading, imported snapshot inference, and in-product recommendations.
- [x] Write the e-commerce monetization engine spec in `docs/specs/ecommerce-monetization-engine.md`.
- [x] Introduce normalized e-commerce offer types and config metadata without changing existing software behavior.
- [x] Implement `ecommerce_one_time_product` first as the conservative throughput baseline for e-commerce.
- [x] Implement `ecommerce_repeat_purchase_product` next with explicit repeat-purchase inputs and honest lifetime assumptions.
- [x] Implement `ecommerce_subscription_replenishment` on the recurring path with retention/churn semantics that match replenishment offers.
- [ ] Keep `ecommerce_bundle_offer` staged until product grouping and AOV/bundle attribution rules are specified cleanly.
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
- [x] Add e-commerce industry types, picker options, and staged UI metadata behind the current software-first selector.
- [ ] Add e-commerce onboarding question flow for one product first, starting with one-time product and repeat-purchase product.
- [ ] Define e-commerce health thresholds with `LTGP:CAC` weighted first, plus repeat purchase, refund drag, gross margin, and payback.
- [ ] Define imported-data heuristics for suggesting e-commerce product lines from Stripe/accounting data before making the industry selectable.

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
- E-commerce is now actionable in the industry selector with manual one-time, repeat-purchase, and subscription/replenishment input paths, while future industries stay compactly staged in a dropdown instead of occupying fixed dashboard space.
- Verification baseline for the current MVP remains `npm test`, `npm run lint`, and `npm run build`.
