"use client";

import { useMemo, useState } from "react";
import type { SubscriptionForecast } from "@/features/kpi/subscription-forecast";
import { forecastStepLabels } from "@/features/kpi/subscription-forecast";
import type { KpiPeriod } from "@/features/kpi/types";
import { formatMoney } from "./formatters";

type ProjectionHeroChartProps = {
  forecast: SubscriptionForecast;
  periodLabel: KpiPeriod;
};

type HeroMetric = "revenue" | "profit" | "customers";

type ChartSeries = {
  title: string;
  description: string;
  unitCaption: string;
  currentLabel: string;
  projectedLabel: string;
  ceilingLabel: string;
  values: number[];
  ceiling: number | null;
  formatter: (value: number | null) => string;
};

const WIDTH = 620;
const HEIGHT = 280;
const PADDING = { top: 18, right: 18, bottom: 28, left: 18 };

const metricOptions: Array<{ id: HeroMetric; label: string }> = [
  { id: "revenue", label: "Revenue" },
  { id: "profit", label: "Profit" },
  { id: "customers", label: "Customers" },
];

const countFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const formatCount = (value: number | null) =>
  value == null ? "—" : countFormatter.format(value);

const periodUnitLabel = (period: KpiPeriod) => {
  if (period === "monthly") {
    return "month";
  }
  if (period === "quarterly") {
    return "quarter";
  }
  return "year";
};

const endOfYearLabel = (period: KpiPeriod, pointCount: number) => {
  if (period === "monthly") {
    return `End of ${pointCount}-month path`;
  }
  if (period === "quarterly") {
    return `End of ${pointCount}-quarter path`;
  }
  return "End of next year";
};

const seriesForMetric = (
  forecast: SubscriptionForecast,
  metric: HeroMetric,
  period: KpiPeriod,
): ChartSeries | null => {
  if (metric === "revenue") {
    const current = forecast.current.revenue;
    const future = forecast.points.map((point) => point.revenue);
    if (current == null || future.length === 0) {
      return null;
    }
    return {
      title: "Revenue curve",
      description: "Live run-rate, next-year path, and steady-state revenue ceiling.",
      unitCaption: `per ${periodUnitLabel(period)}`,
      currentLabel: "Current run-rate",
      projectedLabel: endOfYearLabel(period, future.length),
      ceilingLabel: "Steady-state ceiling",
      values: [current, ...future],
      ceiling: forecast.steadyState.revenuePerPeriod,
      formatter: formatMoney,
    };
  }

  if (metric === "profit") {
    const current = forecast.current.profit;
    const future = forecast.points.map((point) => point.profit);
    if (current == null || future.some((value) => value == null)) {
      return null;
    }
    return {
      title: "Profit curve",
      description: "Gross profit after acquisition cost, projected from the current inputs.",
      unitCaption: `per ${periodUnitLabel(period)}`,
      currentLabel: "Current run-rate",
      projectedLabel: endOfYearLabel(period, future.length),
      ceilingLabel: "Steady-state ceiling",
      values: [current, ...(future as number[])],
      ceiling: forecast.steadyState.profitPerPeriod,
      formatter: formatMoney,
    };
  }

  const future = forecast.points.map((point) => point.endCustomers);
  return {
    title: "Customer curve",
    description: "Current active customers, projected logo growth, and steady-state capacity.",
    unitCaption: "active customers",
    currentLabel: "Current base",
    projectedLabel: endOfYearLabel(period, future.length),
    ceilingLabel: "Hypothetical max customers",
    values: [forecast.current.customers, ...future],
    ceiling: forecast.steadyState.customers,
    formatter: formatCount,
  };
};

const ProjectionHeroChart = ({
  forecast,
  periodLabel,
}: ProjectionHeroChartProps) => {
  const [metric, setMetric] = useState<HeroMetric>("revenue");
  const series = useMemo(
    () => seriesForMetric(forecast, metric, periodLabel),
    [forecast, metric, periodLabel],
  );

  if (series == null) {
    return (
      <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium uppercase tracking-[0.24em] text-white/42">
              Live forecast
            </p>
            <p className="mt-1 text-sm text-white/58">
              Add price or revenue, churn, and sales velocity to unlock the live chart.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const labels = forecastStepLabels(periodLabel, series.values.length - 1);
  const ceilingSeries = labels.map(() => series.ceiling);
  const allValues = [...series.values, ...(series.ceiling != null ? [series.ceiling] : [])];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || Math.max(Math.abs(max), 1);
  const chartMin = min - range * 0.12;
  const chartMax = max + range * 0.08;
  const chartRange = chartMax - chartMin || 1;
  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const pointCount = series.values.length;

  const xForIndex = (index: number) =>
    PADDING.left + (index / Math.max(pointCount - 1, 1)) * innerWidth;

  const yForValue = (value: number) => {
    const normalized = (value - chartMin) / chartRange;
    return PADDING.top + innerHeight - normalized * innerHeight;
  };

  const pathForSeries = (values: number[]) =>
    values
      .map((value, index) => `${index === 0 ? "M" : "L"}${xForIndex(index)} ${yForValue(value)}`)
      .join(" ");

  const areaPath = (() => {
    const line = pathForSeries(series.values);
    const lastX = xForIndex(series.values.length - 1);
    const firstX = xForIndex(0);
    const baselineY = yForValue(chartMin);
    return `${line} L${lastX} ${baselineY} L${firstX} ${baselineY} Z`;
  })();

  const currentValue = series.values[0] ?? null;
  const projectedValue = series.values[series.values.length - 1] ?? null;

  return (
    <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-medium uppercase tracking-[0.24em] text-white/42">
              Live forecast
            </p>
            <p className="mt-1 text-sm text-white/58">{series.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {metricOptions.map((option) => {
              const active = option.id === metric;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    active
                      ? "border-white bg-white text-black"
                      : "border-white/12 bg-white/[0.03] text-white/72 hover:border-white/22 hover:bg-white/[0.06]"
                  }`}
                  onClick={() => setMetric(option.id)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 text-xs text-white/58 sm:grid-cols-3">
          <div>
            <p className="uppercase tracking-[0.22em] text-white/38">
              {series.currentLabel}
            </p>
            <p className="mt-1 text-sm text-white">{series.formatter(currentValue)}</p>
          </div>
          <div>
            <p className="uppercase tracking-[0.22em] text-white/38">
              {series.projectedLabel}
            </p>
            <p className="mt-1 text-sm text-white">{series.formatter(projectedValue)}</p>
          </div>
          <div>
            <p className="uppercase tracking-[0.22em] text-white/38">
              {series.ceilingLabel}
            </p>
            <p className="mt-1 text-sm text-white">{series.formatter(series.ceiling)}</p>
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-4 h-[280px] w-full"
        role="img"
        aria-label={`${series.title} chart`}
      >
        <defs>
          <linearGradient id="hero-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((tick) => {
          const y = PADDING.top + innerHeight - innerHeight * tick;
          return (
            <line
              key={tick}
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="6 8"
            />
          );
        })}

        <path d={areaPath} fill="url(#hero-area)" />

        {series.ceiling != null ? (
          <path
            d={pathForSeries(ceilingSeries as number[])}
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="2"
            strokeDasharray="7 8"
            strokeLinecap="round"
          />
        ) : null}

        <path
          d={pathForSeries(series.values)}
          fill="none"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {series.values.map((value, index) => {
          const x = xForIndex(index);
          const y = yForValue(value);
          const pointLabel = `${labels[index]}: ${series.formatter(value)}`;
          return (
            <g key={`${labels[index]}-${value}`}>
              <circle
                cx={x}
                cy={y}
                r={index === series.values.length - 1 ? 5 : 3.5}
                fill="rgba(255,255,255,0.96)"
                stroke="rgba(0,0,0,0.92)"
                strokeWidth="2"
                aria-label={pointLabel}
              />
            </g>
          );
        })}

        {labels.map((label, index) => (
          <text
            key={label}
            x={xForIndex(index)}
            y={HEIGHT - 6}
            textAnchor="middle"
            fontSize="10"
            fill="rgba(255,255,255,0.44)"
          >
            {label}
          </text>
        ))}
      </svg>

      <div className="mt-3 text-right text-[11px] uppercase tracking-[0.18em] text-white/34">
        {series.unitCaption}
      </div>
    </div>
  );
};

export default ProjectionHeroChart;
