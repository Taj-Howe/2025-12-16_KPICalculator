import test from "node:test";
import assert from "node:assert/strict";
import {
  parsePercentInput,
  percentInputValue,
  percentText,
} from "@/components/home/percent";

test("parsePercentInput converts user-facing percent to decimal", () => {
  assert.equal(parsePercentInput("10"), 0.1);
  assert.equal(parsePercentInput("0.5"), 0.005);
  assert.equal(parsePercentInput(""), undefined);
});

test("percent input helpers round-trip decimal values for form fields", () => {
  const stored = parsePercentInput("10");

  assert.equal(stored, 0.1);
  assert.equal(percentInputValue(stored), "10");
  assert.equal(percentText(stored), "10%");
});
