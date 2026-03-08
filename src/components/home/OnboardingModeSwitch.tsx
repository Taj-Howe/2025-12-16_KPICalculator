"use client";

type OnboardingMode = "guided" | "manual";

const copyByMode: Record<
  OnboardingMode,
  { label: string; description: string }
> = {
  guided: {
    label: "Guided setup",
    description: "Answer the core questions one step at a time.",
  },
  manual: {
    label: "Manual inputs",
    description: "Edit the full operator form directly.",
  },
};

const OnboardingModeSwitch = ({
  value,
  onChange,
}: {
  value: OnboardingMode;
  onChange: (mode: OnboardingMode) => void;
}) => {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {(["guided", "manual"] as const).map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className={`rounded-[20px] border p-4 text-left transition ${
              active
                ? "border-white bg-white text-black"
                : "border-white/10 bg-white/[0.03] text-white hover:border-white/18 hover:bg-white/[0.05]"
            }`}
          >
            <p className="text-sm font-semibold">{copyByMode[mode].label}</p>
            <p
              className={`mt-2 text-sm leading-6 ${
                active ? "text-black/70" : "text-white/56"
              }`}
            >
              {copyByMode[mode].description}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default OnboardingModeSwitch;
