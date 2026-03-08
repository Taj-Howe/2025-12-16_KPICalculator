"use client";

import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import KpiInputPanel from "./KpiInputPanel";
import OnboardingModeSwitch from "./OnboardingModeSwitch";
import SoftwareOnboardingFlow from "./SoftwareOnboardingFlow";

type OfferWorkspaceProps = ComponentProps<typeof KpiInputPanel> & {
  headerActions?: ReactNode;
  error?: string | null;
  onGuidedComplete?: () => void;
};

const OfferWorkspace = ({
  headerActions,
  error,
  onGuidedComplete,
  ...panelProps
}: OfferWorkspaceProps) => {
  const [mode, setMode] = useState<"guided" | "manual">("guided");

  const preserveScrollDuring = (work: () => void) => {
    if (typeof window === "undefined") {
      work();
      return;
    }

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    work();

    requestAnimationFrame(() => {
      window.scrollTo(scrollX, scrollY);
      requestAnimationFrame(() => {
        window.scrollTo(scrollX, scrollY);
      });
    });
  };

  return (
    <section className="panel-shell rounded-[28px] p-5 text-white">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 pb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/34">
            01 Configure Offer
          </p>
          <h2 className="mt-2 text-xl font-semibold">Offer workspace</h2>
          <p className="mt-1 max-w-xl text-sm text-white/58">
            Configure one software offer, choose the modeling mode, and run the
            current scenario.
          </p>
        </div>
        {headerActions}
      </div>

      <div className="mt-5 space-y-5">
        <OnboardingModeSwitch
          value={mode}
          onChange={(nextMode) =>
            preserveScrollDuring(() => {
              setMode(nextMode);
            })
          }
        />

        {error ? (
          <div className="rounded-[22px] border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        ) : null}

        {mode === "guided" ? (
          <SoftwareOnboardingFlow
            value={panelProps.value}
            onChange={panelProps.onChange}
            onCalculate={panelProps.onCalculate}
            isCalculating={panelProps.isCalculating}
            error={error}
            onComplete={onGuidedComplete}
          />
        ) : (
          <KpiInputPanel {...panelProps} />
        )}
      </div>
    </section>
  );
};

export default OfferWorkspace;
