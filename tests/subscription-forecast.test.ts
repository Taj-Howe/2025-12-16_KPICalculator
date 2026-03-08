import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRecurringForecastFromSeed,
  buildSubscriptionForecast,
  canBuildRecurringForecastFromResults,
  deriveSubscriptionMetrics,
  forecastStepLabels,
} from "@/features/kpi/subscription-forecast";
import type { KPIResult, SubscriptionOfferInput } from "@/features/kpi/types";

test("buildSubscriptionForecast returns a live monthly series from direct ARPC inputs", () => {
  const input: SubscriptionOfferInput = {
    offerId: "solo-subscription",
    offerName: "Solo Subscription",
    offerType: "subscription",
    analysisPeriod: "monthly",
    revenueInputMode: "direct_arpc",
    directArpc: 3_000,
    grossProfitInputMode: "costs",
    deliveryCostPerCustomerPerPeriod: 400,
    cacInputMode: "direct",
    directCac: 1_200,
    retentionInputMode: "rate",
    directChurnRatePerPeriod: 0.1,
    newCustomersPerPeriod: 1,
  };

  const derived = deriveSubscriptionMetrics(input);
  const forecast = buildSubscriptionForecast(input, derived);

  assert.equal(forecast.current.revenue, 0);
  assert.equal(forecast.current.profit, -1200);
  assert.equal(forecast.points.length, 12);
  assert.ok(Math.abs(forecast.points[0]?.revenue - 1500) < 1e-9);
  assert.ok(Math.abs((forecast.points[0]?.profit ?? 0) - 100) < 1e-9);
  assert.equal(forecast.steadyState.customers, 10);
  assert.equal(forecast.steadyState.revenuePerPeriod, 30_000);
  assert.equal(forecast.steadyState.profitPerPeriod, 26_000);
});

test("buildSubscriptionForecast preserves current business snapshot when revenue is entered directly", () => {
  const input: SubscriptionOfferInput = {
    offerId: "growth-subscription",
    offerName: "Growth Subscription",
    offerType: "subscription",
    analysisPeriod: "monthly",
    revenueInputMode: "total_revenue",
    revenuePerPeriod: 30_000,
    grossProfitInputMode: "margin",
    grossMargin: 0.8,
    cacInputMode: "derived",
    marketingSpendPerPeriod: 6_000,
    retentionInputMode: "rate",
    directChurnRatePerPeriod: 0.1,
    newCustomersPerPeriod: 3,
    activeCustomersStart: 10,
  };

  const derived = deriveSubscriptionMetrics(input);
  const forecast = buildSubscriptionForecast(input, derived);

  assert.equal(forecast.current.revenue, 30_000);
  assert.equal(forecast.current.profit, 18_000);
  assert.equal(forecast.current.customers, 10);
  assert.equal(forecast.points.length, 12);
  assert.ok(Math.abs((forecast.totals.revenue ?? 0) - 609_986.2143583364) < 1e-9);
  assert.ok(Math.abs((forecast.totals.profit ?? 0) - 415_988.9714866691) < 1e-9);
});

test("buildRecurringForecastFromSeed supports recurring curves from evaluated results", () => {
  const results: KPIResult = {
    cac: 1_200,
    arpc: 3_000,
    churnRate: 0.1,
    retentionRate: 0.9,
    ltv: 26_000,
    ltgpPerCustomer: 26_000,
    ltgpToCacRatio: 21.6666666667,
    cacPaybackPeriods: 0.46,
    hypotheticalMaxCustomers: 10,
    hypotheticalMaxRevenuePerYear: 360_000,
    hypotheticalMaxProfitPerYear: 312_000,
    projectedRevenueNextYear: 0,
    projectedProfitNextYear: 0,
    car: 1,
  };

  assert.equal(canBuildRecurringForecastFromResults(results), true);

  const forecast = buildRecurringForecastFromSeed({
    analysisPeriod: "monthly",
    activeCustomersStart: 0,
    newCustomersPerPeriod: results.car ?? 0,
    arpcPerCustomerPerPeriod: results.arpc ?? 0,
    churnRatePerPeriod: results.churnRate ?? 0,
    ltgpPerCustomer: results.ltgpPerCustomer,
    cacPerNewCustomer: results.cac,
  });

  assert.equal(forecast.points.length, 12);
  assert.equal(forecast.steadyState.customers, 10);
  assert.equal(forecast.steadyState.revenuePerPeriod, 30_000);
  assert.equal(forecast.steadyState.profitPerPeriod, 26_000);
});

test("forecastStepLabels matches the selected analysis period", () => {
  assert.deepEqual(forecastStepLabels("monthly", 3), ["Now", "M1", "M2", "M3"]);
  assert.deepEqual(forecastStepLabels("quarterly", 2), ["Now", "Q1", "Q2"]);
  assert.deepEqual(forecastStepLabels("yearly", 1), ["Now", "Y1"]);
});
