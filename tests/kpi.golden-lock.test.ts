import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { evaluateKpis } from "../src/features/kpi/service";
import type { KPIInput } from "../src/features/kpi/types";

type GoldenCase = {
  name: string;
  input: KPIInput;
  expected: {
    results: ReturnType<typeof evaluateKpis>["results"];
    warnings: string[];
  };
};

const fixturesDir = path.join(
  process.cwd(),
  "tests",
  "golden",
  "calculation-lock-v1",
);

const fixtureFiles = fs
  .readdirSync(fixturesDir)
  .filter((file) => file.endsWith(".json"))
  .sort();

for (const file of fixtureFiles) {
  const fixturePath = path.join(fixturesDir, file);
  const raw = fs.readFileSync(fixturePath, "utf8");
  const fixture = JSON.parse(raw) as GoldenCase;

  test(`golden lock: ${fixture.name}`, () => {
    const evaluation = evaluateKpis(fixture.input);

    assert.deepEqual(evaluation.results, fixture.expected.results);
    assert.deepEqual(evaluation.warnings, fixture.expected.warnings);
  });
}
