import { calculateSampleKpi } from "./formulas";
import type { KPIInput, KPIResult } from "./types";

export const calculateKpis = (inputs: KPIInput): KPIResult[] => {
  return [calculateSampleKpi(inputs)];
};
