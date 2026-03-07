"use client";

import type { SubscriptionOfferInput } from "@/features/kpi/types";

const offerTypeOptions = [
  { value: "software_subscription", label: "Software Subscription", enabled: true },
  { value: "subscription", label: "Legacy Subscription", enabled: true },
  { value: "software_paid_pilot", label: "Paid Pilot", enabled: false },
  { value: "software_pilot_to_subscription", label: "Pilot to Subscription", enabled: false },
  { value: "software_token_pricing", label: "Token Pricing", enabled: false },
  { value: "software_hybrid_platform_usage", label: "Platform + Usage", enabled: false },
  { value: "software_implementation_plus_subscription", label: "Implementation + Subscription", enabled: false },
] as const;

type OfferTypePillsProps = {
  value: SubscriptionOfferInput["offerType"];
  onChange: (offerType: SubscriptionOfferInput["offerType"]) => void;
};

const OfferTypePills = ({ value, onChange }: OfferTypePillsProps) => {
  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium tracking-[0.01em] text-white/82">
        Offer type
      </p>
      <div className="flex flex-wrap gap-2">
        {offerTypeOptions.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={!option.enabled}
              onClick={() => option.enabled && onChange(option.value)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                active
                  ? "border-white bg-white text-black"
                  : option.enabled
                    ? "border-white/12 bg-white/[0.03] text-white/72 hover:border-white/22 hover:bg-white/[0.06]"
                    : "cursor-not-allowed border-white/8 bg-white/[0.01] text-white/28"
              }`}
            >
              {option.label}
              {!option.enabled ? " (Soon)" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OfferTypePills;
