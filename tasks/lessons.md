# Lessons

- Percent-based form fields need a shared parse/display helper. If the UI shows `10` for `10%`, the stored value must be `0.1`, or the next render will multiply it again.
- If unit-economics inputs already define the growth model, project outputs from those drivers instead of leaving business-scale metrics blank.
- Keep steady-state ceiling metrics separate from next-year projections. If the UI calls both “max,” users will assume the wrong model.
- Do not let taxonomy work make the product harder to think through. The user-facing flow still needs to start from simple drivers like sales velocity, churn, CAC, and LTGP.
- For pill-style controls, keep hover states simple. Default to a full accent fill instead of layered borders, rings, or muddy intermediate states.
