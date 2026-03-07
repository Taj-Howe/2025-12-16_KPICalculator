"use client";

import type { SampleDataControlsProps } from "./types";

const SampleDataControls = ({
  onLoadSample,
  onClear,
}: SampleDataControlsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onLoadSample}
        className="rounded-full border border-white/60 px-3 py-1 text-sm text-white transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] focus-visible:border-[var(--accent)] focus-visible:bg-[var(--accent)] focus-visible:text-[var(--accent-foreground)]"
      >
        Load sample data
      </button>
      <button
        type="button"
        onClick={onClear}
        className="rounded-full border border-white/60 px-3 py-1 text-sm text-white transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] focus-visible:border-[var(--accent)] focus-visible:bg-[var(--accent)] focus-visible:text-[var(--accent-foreground)]"
      >
        Clear inputs
      </button>
    </div>
  );
};

export default SampleDataControls;
