import test from "node:test";
import assert from "node:assert/strict";

import { calculateSampleKpi } from "../src/features/kpi/formulas";

test("calculateSampleKpi sums inputs", () => {
  const result = calculateSampleKpi({ a: 1, b: 2 });
  assert.equal(result.value, 3);
});
