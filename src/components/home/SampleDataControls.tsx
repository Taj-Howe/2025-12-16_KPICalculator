"use client";

import type { SampleDataControlsProps } from "./types";

const SampleDataControls = ({ onLoadSample, onClear }: SampleDataControlsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onLoadSample}
        className="rounded border border-white/60 px-3 py-1 text-sm text-white"
      >
        Load sample data
      </button>
      <button
        type="button"
        onClick={onClear}
        className="rounded border border-white/60 px-3 py-1 text-sm text-white"
      >
        Clear inputs
      </button>
    </div>
  );
};

export default SampleDataControls;
