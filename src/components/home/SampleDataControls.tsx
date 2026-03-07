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
        className="pill-action rounded-full px-3 py-1 text-sm"
      >
        Load sample data
      </button>
      <button
        type="button"
        onClick={onClear}
        className="pill-action rounded-full px-3 py-1 text-sm"
      >
        Clear inputs
      </button>
    </div>
  );
};

export default SampleDataControls;
