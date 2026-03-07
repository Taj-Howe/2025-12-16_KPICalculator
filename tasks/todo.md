# KPI Calculator Roadmap

## Current Product Shape
- Single-offer profitability calculator, optimized first for software subscriptions.
- Core math is locked with regression coverage and legacy compatibility.
- Current UI is a dashboard-first dark-mode workflow with live forecast, grouped results, and saved reports.

## Next Build
- [ ] Rework the home experience around a clearer software/tech offer picker.
- [ ] Build the next software/tech offer types in this order:
  - paid pilot
  - token-priced AI product
  - hybrid platform + usage
  - implementation + subscription

## Intelligence Layer
- [ ] Add AI that analyzes the current offer data, runs improvement scenarios against the existing math, and identifies the single highest-ROI move so the app can surface the lowest-hanging-fruit metric to improve first.
- [ ] Add scenario and sensitivity analysis that shows what happens if the operator increases sales velocity, lowers CAC, lowers churn, improves gross margin, or changes price, so the app can quantify which lever creates the biggest upside before AI summarizes it.
- [ ] Make the scenario/sensitivity layer exportable with a comprehensive dataset, including baseline inputs, baseline outputs, each lever tested, percent and absolute change assumptions, resulting KPI deltas, ranked upside opportunities, AI recommendation summary, and enough structured fields for CSV/API/report consumption.
- [ ] Expand the graph into a richer analytics surface for payments/accounting integrations: trend overlays, cohort movement, payback movement, churn/retention shifts, revenue mix, margin drift, and other decision-making stats that matter when real business data is flowing in automatically.

## Integrations
- [ ] Expose this as an API/integration surface so external systems can generate reports automatically.
- [ ] Make payments/accounting integration a one-click setup so the app can automatically analyze Stripe or another payments/accounting source.

## UI Follow-Ups
- [x] Make `Offer Inputs` a wide workspace and keep decision output under `Reports` so the tab structure matches the user workflow more cleanly.
- [ ] Continue polishing the dashboard after the offer taxonomy stabilizes, especially around the software/tech offer picker and deeper analytics views.

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
- Verification baseline for the current MVP remains `npm test`, `npm run lint`, and `npm run build`.
