"use client";

type SparklineProps = {
  data: (number | null)[];
  width?: number;
  height?: number;
  stroke?: string;
};

const Sparkline = ({
  data,
  width = 120,
  height = 40,
  stroke = "#2563eb",
}: SparklineProps) => {
  const points = buildPoints(data, width, height);

  if (!points) {
    return (
      <svg width={width} height={height} role="img" aria-label="No data">
        <text
          x={width / 2}
          y={height / 2}
          dominantBaseline="middle"
          textAnchor="middle"
          fill="#6b7280"
          fontSize="10"
        >
          No data
        </text>
      </svg>
    );
  }

  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
};

const buildPoints = (
  data: (number | null)[],
  width: number,
  height: number,
) => {
  const filtered = data
    .map((value, index) => ({ value, index }))
    .filter((point) => point.value != null) as { value: number; index: number }[];

  if (filtered.length < 2) {
    return null;
  }

  const minValue = Math.min(...filtered.map((point) => point.value));
  const maxValue = Math.max(...filtered.map((point) => point.value));
  const yRange = maxValue - minValue || 1;
  const lastIndex = filtered[filtered.length - 1].index || 1;

  const points = filtered
    .map((point) => {
      const x = (point.index / lastIndex) * width;
      const normalizedY = (point.value - minValue) / yRange;
      const y = height - normalizedY * height;
      return `${x},${y}`;
    })
    .join(" ");

  return points;
};

export default Sparkline;
