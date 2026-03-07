# Lessons

- Percent-based form fields need a shared parse/display helper. If the UI shows `10` for `10%`, the stored value must be `0.1`, or the next render will multiply it again.
- If unit-economics inputs already define the growth model, project outputs from those drivers instead of leaving business-scale metrics blank.
- Keep steady-state ceiling metrics separate from next-year projections. If the UI calls both “max,” users will assume the wrong model.
- Do not let taxonomy work make the product harder to think through. The user-facing flow still needs to start from simple drivers like sales velocity, churn, CAC, and LTGP.
- For pill-style controls, keep hover states simple. Default to a full accent fill instead of layered borders, rings, or muddy intermediate states.
- When the user gives a visual reference, match the overall design language first. Reduce decorative color and gradients unless the reference clearly calls for them.
- When restyling a screen, update the interactive child controls too. A new container shell is not enough if radios, toggles, and field groupings still look like the old UI.
- Be careful with inline SVG `<title>` nodes in client-rendered charts. Browser normalization can produce hydration mismatches, so prefer deterministic labels or aria attributes instead.
- When a screen has multiple primary surfaces, add an explicit top-level view selector instead of letting sections compete in one layout. It scales better when more sections get added later.
- If a hero chart is supposed to guide decisions, wire it to the live form state and shared business math. Static interpolations break trust as soon as the inputs change.
- In a near-black UI, form controls need explicit chrome. Subtle border-only styling is not enough for inputs and selects; give them a defined surface, width, and custom select treatment so they do not read like plain text.
- Do not use broad block-level `<label>` wrappers as generic field containers in dense interactive layouts. They can create oversized click targets and interfere with nearby buttons and custom controls.
