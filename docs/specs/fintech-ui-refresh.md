# Fintech UI Refresh Spec

## Objective
Redesign the home experience so the app feels like a focused software/fintech product instead of a generic internal calculator. The UI should make the core model obvious:

1. Pick the software offer type.
2. Choose the modeling mode.
3. Enter the few drivers that matter.
4. Read the answer in a clear hierarchy:
   - unit economics
   - steady-state ceiling
   - next-year projection
   - saved trend context

This refresh is visual and structural. It should not rewrite the KPI math.

## Product Direction
The current screen is functionally correct but visually flat and cognitively dense.

Current issues:
- hero/header does not establish the product as a premium software analytics tool
- form, results, save, and reports all compete at the same visual weight
- no strong separation between input modes and output types
- reports/trends feel bolted on instead of part of one dashboard
- there is no visual anchor for projected upside, which is the most compelling output

Target experience:
- dark-mode fintech shell
- restrained but intentional accent system
- strong first-screen story around growth potential
- guided input flow instead of one long utility form
- outputs presented as decision cards, not a long KPI list

## Primary User Journey
1. Land on the home screen.
2. Immediately see a hero chart and headline framing projected upside.
3. Pick an offer type.
4. Pick `Unit Economics` or `Business Metrics`.
5. Enter core drivers.
6. Read the key outputs first:
   - LTGP:CAC
   - payback
   - sales velocity
   - churn
7. Expand into ceiling and projection sections.
8. Save the snapshot and compare trend movement.

## Information Architecture
The home page should move to five vertical sections.

### 1. Hero
Purpose:
- explain what the app does in one glance
- visually establish premium product quality
- preview upside with motion and charting

Contents:
- product eyebrow
- strong headline
- short supporting paragraph
- primary CTA: jump to calculator
- secondary CTA: load sample / explore data
- minimal hero graph showing projected revenue path or max revenue envelope
- 2 to 3 compact stat pills:
  - LTGP:CAC
  - payback
  - projected profit next year

### 2. Offer Workspace
Purpose:
- concentrate the main calculator interaction in one premium card
- reduce cognitive load with guided sections

Structure:
- step header: `1. Configure Offer`
- offer type selector
- calculator mode switch
- monetization summary strip
- input groups shown as stacked cards

Input card groups:
- Revenue
- Gross Profit
- Acquisition
- Retention
- Context / metadata

Rules:
- only show fields relevant to the current mode
- keep labels business-readable, not implementation-driven
- use helper text sparingly and place it under the field, not in walls of copy

### 3. Decision Output Rail
Purpose:
- surface the answer, not the raw data

Structure:
- step header: `2. Evaluate Economics`
- top row of four decision cards:
  - LTGP:CAC
  - CAC payback
  - sales velocity
  - churn
- second row with grouped sections:
  - Unit Economics
  - Steady-State Ceiling
  - Next-Year Projection
- optional warning banner section beneath cards

Output grouping:
- Unit Economics:
  - CAC
  - ARPC
  - LTV
  - LTGP
- Steady-State Ceiling:
  - hypothetical max customers
  - hypothetical max revenue/year
  - hypothetical max profit/year
- Next-Year Projection:
  - projected revenue next year
  - projected profit next year
  - customer bridge summary

### 4. Save + Report Context
Purpose:
- make save/report actions feel like part of the same workflow

Structure:
- compact save panel beneath results
- report metadata fields in a lighter secondary card
- saved report list and report detail as a separate dashboard section, not competing with the calculator itself

### 5. Trends Dashboard
Purpose:
- keep historical context visible without dominating the main flow

Structure:
- trend chart card
- metric selector controls styled as segmented pills
- latest snapshot summary cards
- report history list

## Layout System
Desktop:
- 12-column grid
- hero full width
- workspace + output rail side by side beneath hero
- reports/trends full width below main workspace

Recommended desktop allocation:
- workspace: 5 columns
- results: 7 columns

Tablet/mobile:
- single column stack
- hero first
- workspace second
- outputs third
- reports/trends below
- sticky CTA bar optional later, not phase 1

## Visual Direction
### Theme
- default dark mode
- not pure black everywhere; use layered surfaces
- high contrast text with muted secondary copy
- one cold accent color for interaction and charts

### Tone
- sophisticated
- minimal
- analytical
- premium but not flashy

### Avoid
- generic startup gradients
- overuse of glassmorphism
- rainbow chart palettes
- oversized cards with too much dead space
- purple default aesthetic

## Design Tokens
Use CSS variables first, then map to Radix tokens if needed.

Core token groups:
- background
- elevated surface
- border
- muted text
- strong text
- accent
- accent foreground
- positive
- warning
- danger

Suggested initial palette direction:
- background: deep charcoal / blue-black
- surface-1: slightly lifted slate-black
- surface-2: denser inset panel
- accent: cyan or ice-blue
- positive: emerald
- warning: amber

Radius:
- cards: medium-large
- pills: full
- inputs: medium

Shadows:
- subtle outer shadow for hero and decision cards
- inner border contrast instead of heavy blur

## Typography
Current typography is too generic for the target feel.

Direction:
- use a more intentional sans stack for headings and UI
- strong size contrast between hero, section headers, and metrics
- tabular numerals for KPI cards and charts

Type hierarchy:
- hero headline
- section title
- card title
- metric value
- helper/body text
- metadata caption

## Motion
Keep motion minimal and purposeful.

Allowed motion:
- hero chart draw-in on load
- staggered fade/slide for metric cards
- hover transitions on pills and buttons
- subtle active-state transitions for segmented controls

Avoid:
- floating animations
- springy dashboard widgets everywhere
- decorative motion disconnected from data

## Hero Graph
Purpose:
- visualize projected increase in hypothetical max revenue
- create immediate product appeal

Phase 1 graph:
- simple area/line graph
- x-axis: periods
- y-axis: revenue
- two series max:
  - current trajectory
  - steady-state ceiling or projected path

Behavior:
- if no live evaluation exists, show seeded sample data
- once the user calculates, graph updates from current results

## Component Plan
New or reworked components for phase 1:
- `src/components/home/HeroSection.tsx`
- `src/components/home/OfferWorkspace.tsx`
- `src/components/home/OfferModeSwitch.tsx`
- `src/components/home/OfferTypePills.tsx`
- `src/components/home/DecisionCards.tsx`
- `src/components/home/ResultsSections.tsx`
- `src/components/home/ProjectionHeroChart.tsx`
- `src/components/home/SaveReportCard.tsx`
- `src/components/home/ReportsDashboard.tsx`

Existing components likely to be kept but rewritten internally:
- `AppHeader.tsx`
- `KpiInputPanel.tsx`
- `ReportsPanel.tsx`
- `SampleDataControls.tsx`

## Radix Themes Adoption
Scope for phase 1:
- install and wrap app with Radix Themes provider
- use Radix primitives for:
  - buttons
  - cards
  - text fields
  - select
  - tabs or segmented control equivalent
  - badges/pills where useful

Constraint:
- do not let Radix default styling dictate the final look
- override tokens so the app still has a distinct product identity

## Data/Interaction Constraints
- no KPI math changes in this phase unless a visual requirement exposes a real bug
- keep current API/report functionality intact
- preserve existing save/report flows while restyling them
- preserve current software subscription support and staged offer placeholders

## Implementation Phases
### Phase 1: Shell + Design System
- add Radix Themes
- define color, spacing, radius, shadow tokens
- update global layout shell
- build hero section

### Phase 2: Calculator Workspace
- rebuild the input experience into grouped cards
- replace generic selectors with intentional controls
- keep current business/unit-economics logic intact

### Phase 3: Results Experience
- build decision cards
- split results into grouped sections
- add projection/ceiling visual hierarchy
- connect hero chart to current evaluation

### Phase 4: Reports Dashboard
- redesign saved reports, comparison, and trends panels
- make trend views consistent with the new visual system

### Phase 5: Polish
- mobile pass
- keyboard/focus pass
- empty/error/loading states
- motion tuning

## Acceptance Criteria
The redesign is successful when:
- the first screen reads like a premium fintech SaaS product
- the user can understand the core flow without reading long instructions
- unit economics and business metrics feel like two clean modes, not a pile of fields
- the key decision metrics are visible before secondary KPIs
- projection vs hypothetical max is visually unambiguous
- the page works on mobile and desktop without layout breakage
- existing KPI calculations and saved reports still function

## Out of Scope
Not part of this refresh:
- implementing the new software offer math for pilots/tokens/hybrid offers
- CRM/Stripe integration
- dashboard-wide portfolio analytics across multiple offers
- auth/report backend changes beyond what is needed for UI support
