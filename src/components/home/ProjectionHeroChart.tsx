"use client";

import { formatMoney } from "./formatters";

type ProjectionHeroChartProps = {
  baselineRevenue: number;
  projectedRevenue: number | null;
  ceilingRevenue: number | null;
  periodLabel: string;
};

const WIDTH = 620;
const HEIGHT = 280;
const PADDING = { top: 18, right: 18, bottom: 28, left: 18 };
const STEPS = 8;

const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

const interpolateSeries = (start: number, end: number) => {
  return Array.from({ length: STEPS }, (_, index) => {
    const t = index / (STEPS - 1);
    return start + (end - start) * easeOut(t);
  });
};

const ProjectionHeroChart = ({
  baselineRevenue,
  projectedRevenue,
  ceilingRevenue,
  periodLabel,
}: ProjectionHeroChartProps) => {
  const safeBaseline = Math.max(baselineRevenue, 1);
  const safeProjected = Math.max(projectedRevenue ?? safeBaseline * 1.5, 1);
  const safeCeiling = Math.max(
    ceilingRevenue ?? Math.max(safeProjected * 1.15, safeBaseline * 1.8),
    1,
  );

  const projectedSeries = interpolateSeries(safeBaseline, safeProjected);
  const ceilingSeries = interpolateSeries(safeBaseline * 1.02, safeCeiling);
  const allValues = [...projectedSeries, ...ceilingSeries];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || max || 1;
  const innerWidth = WIDTH - PADDING.left - PADDING.right;
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const xForIndex = (index: number) =>
    PADDING.left + (index / (STEPS - 1)) * innerWidth;

  const yForValue = (value: number) => {
    const normalized = (value - min) / range;
    return PADDING.top + innerHeight - normalized * innerHeight;
  };

  const pathForSeries = (series: number[]) =>
    series
      .map((value, index) => `${index === 0 ? "M" : "L"}${xForIndex(index)} ${yForValue(value)}`)
      .join(" ");

  const areaPath = (() => {
    const line = pathForSeries(projectedSeries);
    const lastX = xForIndex(projectedSeries.length - 1);
    const firstX = xForIndex(0);
    const baselineY = yForValue(min);
    return `${line} L${lastX} ${baselineY} L${firstX} ${baselineY} Z`;
  })();

  const labels = Array.from({ length: STEPS }, (_, index) => {
    if (index === 0) {
      return "Now";
    }
    if (index === STEPS - 1) {
      return `${STEPS - 1} ${periodLabel}`;
    }
    return `${index}`;
  });

  return (
    <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between gap-4 text-xs text-white/58">
        <div>
          <p className="font-medium uppercase tracking-[0.24em] text-white/42">
            Revenue Curve
          </p>
          <p className="mt-1 text-white/58">
            Baseline vs projected path vs steady-state ceiling
          </p>
        </div>
        <div className="text-right">
          <p>{formatMoney(safeBaseline)} current</p>
          <p>{formatMoney(safeProjected)} projected</p>
          <p>{formatMoney(safeCeiling)} ceiling</p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-4 h-[280px] w-full"
        role="img"
        aria-label="Projected revenue graph"
      >
        <defs>
          <linearGradient id="hero-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
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
        <path
          d={pathForSeries(ceilingSeries)}
          fill="none"
          stroke="rgba(255,255,255,0.32)"
          strokeWidth="2"
          strokeDasharray="7 8"
          strokeLinecap="round"
        />
        <path
          d={pathForSeries(projectedSeries)}
          fill="none"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {projectedSeries.map((value, index) => {
          const x = xForIndex(index);
          const y = yForValue(value);
          return (
            <g key={labels[index]}>
              <circle
                cx={x}
                cy={y}
                r={index === projectedSeries.length - 1 ? 5 : 3.5}
                fill="rgba(255,255,255,0.96)"
                stroke="rgba(0,0,0,0.92)"
                strokeWidth="2"
              />
              <title>
                {labels[index]}: {formatMoney(value)}
              </title>
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
    </div>
  );
};

export default ProjectionHeroChart;
