"use client";

import type { ComponentProps, ReactNode } from "react";
import KpiInputPanel from "./KpiInputPanel";

type OfferWorkspaceProps = ComponentProps<typeof KpiInputPanel> & {
  headerActions?: ReactNode;
};

const OfferWorkspace = ({
  headerActions,
  ...panelProps
}: OfferWorkspaceProps) => {
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

      <div className="mt-5">
        <KpiInputPanel {...panelProps} />
      </div>
    </section>
  );
};

export default OfferWorkspace;
