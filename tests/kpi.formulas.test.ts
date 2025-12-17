import test from "node:test";
import assert from "node:assert/strict";

import {
  annualizedRevenue,
  arpc,
  cac,
  churnRate,
  ltvSubscription,
  ltvTransactional,
  ltgpPerCustomer,
  ratioLtgpToCac,
} from "../src/features/kpi/formulas";

const approxEqual = (actual: number | null, expected: number, delta = 1e-6) => {
  assert.ok(actual != null, "Value should not be null");
  assert.ok(
    Math.abs(actual - expected) <= delta,
    `Expected ${actual} ~ ${expected}`,
  );
};

test("subscription metrics compute expected values", () => {
  const avgCustomers = (100 + 110) / 2;
  const arpcValue = arpc(100_000, avgCustomers);
  approxEqual(arpcValue, 952.380952);

  const churnRateValue = churnRate(10, 100);
  approxEqual(churnRateValue, 0.1);

  const ltv = ltvSubscription(arpcValue, 0.7, churnRateValue);
  approxEqual(ltv, (arpcValue! * 0.7) / 0.1);

  const cacValue = cac(20_000, 20);
  approxEqual(cacValue, 1_000);

  const ltgpValue = ltgpPerCustomer(ltv);
  approxEqual(ltgpValue, (arpcValue! * 0.7) / 0.1);

  const ratio = ratioLtgpToCac(ltgpValue, cacValue);
  approxEqual(ratio, ((arpcValue! * 0.7) / 0.1) / 1000);
});

test("transactional metrics compute expected values", () => {
  const arpcValue = arpc(50_000, 200);
  approxEqual(arpcValue, 250);

  const ltv = ltvTransactional(arpcValue, 0.5, 0.6);
  approxEqual(ltv, 312.5);
});

test("cac returns null when new customers are zero", () => {
  const cacValue = cac(10_000, 0);
  assert.equal(cacValue, null);
});

test("ltv returns null when churn is zero", () => {
  const churnRateValue = churnRate(0, 100);
  const ltv = ltvSubscription(100, 0.5, churnRateValue);
  assert.equal(ltv, null);
});

test("quarterly revenue annualizes by 4", () => {
  const annual = annualizedRevenue(10_000, "quarterly");
  assert.equal(annual, 40_000);
});
