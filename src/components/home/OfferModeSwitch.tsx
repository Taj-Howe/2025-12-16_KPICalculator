"use client";

import { ChoiceCard, panelClassName } from "./form-primitives";

type CalculatorMode = "unit_economics" | "business_metrics";

type OfferModeSwitchProps = {
  value: CalculatorMode;
  onChange: (mode: CalculatorMode) => void;
};

const OfferModeSwitch = ({ value, onChange }: OfferModeSwitchProps) => {
  return (
    <div className={panelClassName}>
      <p className="font-medium text-white">Calculator mode</p>
      <p className="mt-1 text-sm text-white/58">
        `Unit economics` models one offer from price, churn, CAC, and delivery
        cost. `Business metrics` models the business from revenue, spend, and
        customer counts.
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <ChoiceCard
          checked={value === "unit_economics"}
          title="Unit economics"
          description="Model one offer from price, churn, CAC, and delivery cost."
          onSelect={() => onChange("unit_economics")}
        />
        <ChoiceCard
          checked={value === "business_metrics"}
          title="Business metrics"
          description="Model from revenue, acquisition spend, and customer counts."
          onSelect={() => onChange("business_metrics")}
        />
      </div>
    </div>
  );
};

export default OfferModeSwitch;
