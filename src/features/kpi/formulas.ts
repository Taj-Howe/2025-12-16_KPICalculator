import type { KPIInput, KPIResult } from "./types";

export const calculateSampleKpi = (inputs: KPIInput): KPIResult => {
  const total = Object.values(inputs).reduce((sum, value) => sum + value, 0);
  return {
    name: "sample",
    value: total,
  };
};
