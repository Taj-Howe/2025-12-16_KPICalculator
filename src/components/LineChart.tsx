type ChartSeries = {
  name: string;
  values: Array<number | null>;
  color?: string;
};

type LineChartProps = {
  labels: string[];
  series: ChartSeries[];
  width?: number;
  height?: number;
  formatValue?: (value: number) => string;
  yLabel?: string;
};

const defaults = {
  width: 640,
  height: 220,
};

const margins = {
  top: 12,
  right: 12,
  bottom: 28,
  left: 44,
};

const palette = ["rgba(255,255,255,0.92)", "rgba(255,255,255,0.38)"];

const LineChart = ({
  labels,
  series,
  width = defaults.width,
  height = defaults.height,
  formatValue = (n: number) => n.toString(),
  yLabel,
}: LineChartProps) => {
  const plotWidth = width - margins.left - margins.right;
  const plotHeight = height - margins.top - margins.bottom;

  const allPoints = series.flatMap((s) =>
    s.values
      .map((value, index) => ({ value, index }))
      .filter((p): p is { value: number; index: number } => p.value != null),
  );

  if (allPoints.length === 0) {
    return (
      <svg width={width} height={height} role="img" aria-label="No data">
        <text
          x={width / 2}
          y={height / 2}
          dominantBaseline="middle"
          textAnchor="middle"
          fill="rgba(255,255,255,0.38)"
          fontSize="12"
        >
          No data
        </text>
      </svg>
    );
  }

  const minVal = Math.min(...allPoints.map((p) => p.value));
  const maxVal = Math.max(...allPoints.map((p) => p.value));
  const pad = Math.max((maxVal - minVal) * 0.05, maxVal === minVal ? Math.abs(maxVal || 1) * 0.05 : 0);
  const yMin = minVal - pad;
  const yMax = maxVal + pad;

  const xForIndex = (i: number) => {
    const lastIndex = Math.max(labels.length - 1, 1);
    return margins.left + (i / lastIndex) * plotWidth;
  };

  const yForValue = (v: number) => {
    const ratio = (v - yMin) / (yMax - yMin || 1);
    return margins.top + (1 - ratio) * plotHeight;
  };

  return (
    <svg width={width} height={height} role="img" aria-hidden="true">
      {/* Axes */}
      <line
        x1={margins.left}
        y1={height - margins.bottom}
        x2={width - margins.right}
        y2={height - margins.bottom}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={1}
      />
      <line
        x1={margins.left}
        y1={margins.top}
        x2={margins.left}
        y2={height - margins.bottom}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={1}
      />
      {yLabel && (
        <text
          x={margins.left - 8}
          y={margins.top}
          textAnchor="end"
          fontSize="10"
          fill="rgba(255,255,255,0.38)"
        >
          {yLabel}
        </text>
      )}

      {/* Lines and points */}
      {series.map((s, seriesIdx) => {
        const color = s.color ?? palette[seriesIdx % palette.length];
        const seriesKey = `${s.name}-${seriesIdx}`;
        const segs: Array<[number, number, number, number]> = [];
        let prev: { x: number; y: number } | null = null;
        s.values.forEach((value, index) => {
          if (value == null) {
            prev = null;
            return;
          }
          const current = { x: xForIndex(index), y: yForValue(value) };
          if (prev) {
            segs.push([prev.x, prev.y, current.x, current.y]);
          }
          prev = current;
        });

        return (
          <g key={seriesKey}>
            {segs.map((seg, idx) => (
              <line
                key={`${seriesKey}-seg-${idx}`}
                x1={seg[0]}
                y1={seg[1]}
                x2={seg[2]}
                y2={seg[3]}
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}
            {s.values.map((value, index) => {
              if (value == null) return null;
              const x = xForIndex(index);
              const y = yForValue(value);
              const label = labels[index] ?? "";
              const title = `${label}${label ? ": " : ""}${s.name}: ${formatValue(value)}`;
              return (
                <circle
                  key={`${seriesKey}-pt-${index}`}
                  cx={x}
                  cy={y}
                  r={4}
                  fill={color}
                  stroke="rgba(5,5,5,0.95)"
                  strokeWidth={1}
                >
                  <title>{title}</title>
                </circle>
              );
            })}
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${margins.left}, ${margins.top - 4})`}>
        {series.map((s, idx) => {
          const color = s.color ?? palette[idx % palette.length];
          const seriesKey = `${s.name}-${idx}`;
          return (
            <g key={`legend-${seriesKey}`} transform={`translate(${idx * 120}, 0)`}>
              <rect x={0} y={-8} width={12} height={12} fill={color} />
              <text x={16} y={2} fontSize="10" fill="rgba(255,255,255,0.58)">
                {s.name}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export default LineChart;
