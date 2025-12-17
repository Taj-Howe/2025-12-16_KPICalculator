This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Business KPI Calculator

A simple web app that calculates business KPIs from a single, consistent analysis period and saves reports so a business can track changes over time.

### Core rule: single analysis period
Every number you enter must match the selected period:
- **monthly**
- **quarterly**
- **yearly**

If you pick **quarterly**, then ARPC is *per quarter*, churn is *per quarter*, CAC is *per quarter*, etc. No hidden conversions. No “monthly churn + yearly revenue” chaos.

### Supported business models
The app supports different business models because the same KPI name can mean different things depending on how revenue behaves.

- **Subscription**: recurring revenue, churn is meaningful.
- **Transactional**: one-time purchases; “churn” is replaced by a retention/repeat proxy.
- **Hybrid**: mix of both (supported, but may require additional inputs to avoid garbage outputs).

### KPIs (v1)
- **CAC** (Customer Acquisition Cost)
- **LTGP** (Lifetime Gross Profit)
- **LTGP:CAC** (primary growth ratio)
- **LTV** (Lifetime Value; computed in a model-aware way)
- **Churn** (subscription) or retention proxy (transactional)
- **ARPC** (Average Revenue Per Customer, per selected period)
- **CAR** (Customer Acquisition Rate)
- **Hypothetical Max Revenue / Year** (annualized from selected period)
- **Hypothetical Max Profit / Year** (annualized from selected period)

### Definitions (important so the math isn’t vibes)
- **LTGP:CAC (growth lens)**
  - Interpretation: how many dollars of lifetime gross profit you generate per $1 spent acquiring a customer.
  - Higher ratio → more reinvestable gross profit → faster growth potential.

- **Annualized outputs**
  - “Max Revenue/Year” and “Max Profit/Year” are **annualized** using the selected period:
    - monthly → ×12
    - quarterly → ×4
    - yearly → ×1

### User workflow
1. **Sign in**
2. Choose **Period** (monthly/quarterly/yearly) and **Business Model**
3. Enter inputs (all “per period”)
4. Click **Calculate**
5. View dashboard results + warnings
6. Optional: **Save report** (snapshot) with title + notes **and a period label** (see below)
7. Browse saved reports and compare over time

#### Period labels
- Every saved report must include a `periodLabel`, which captures the specific month/quarter/year the data represents.
- The Save Report panel gives you a dropdown of valid period ranges (start date + period length) so the label always matches the selected cadence.
- Formats:
  - monthly → `YYYY-MM` (e.g., `2026-01`)
  - quarterly → `YYYY-Q#` (e.g., `2026-Q1`)
  - yearly → `YYYY` (e.g., `2026`)
- `createdAt` tracks when the report was saved; `periodLabel` tracks the time bucket the metrics describe. Trends and cohorts rely on `periodLabel`, so unlabeled reports are excluded from charts/tables.

### System boundaries (what this app is / is not)
#### This app is
- A KPI calculator + report logger
- A consistent-period modeling tool
- A warning-first system (it will tell you when inputs create misleading results)

#### This app is not
- A bookkeeping system
- A forecasting engine with “AI guesses”
- A replacement for analytics platforms
- A place to import raw transaction logs (at least not in v1)

### Architecture (Phase 1 target)
- Next.js (App Router) + TypeScript
- Feature module pattern:
  - `src/features/kpi/*` = all KPI logic and schemas
  - `src/db/*` = persistence
  - `src/app/api/*` = API routes
- KPI math is implemented as **pure functions** (deterministic, testable).
- Orchestration layer validates inputs, runs formulas, returns:
  - `results`
  - `warnings` (e.g., churn near 0 inflating LTV)

### Data model
See `docs/data-model.md`

### Wireframes
See `docs/wireframes.md`

### Roadmap
- Phase 0: scope + workflows + boundaries ✅
- Phase 1: full-stack app, auth, DB persistence, calculation API
- Later: cohort comparisons, report diffs, charting, import/export, integrations
