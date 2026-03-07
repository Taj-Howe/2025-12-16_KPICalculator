"use client";

import { Badge, Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import type { KPIResult, KpiPeriod } from "@/features/kpi/types";
import ProjectionHeroChart from "./ProjectionHeroChart";
import { formatMoney, formatRatio } from "./formatters";

type HeroSectionProps = {
  results: KPIResult | null;
  analysisPeriod: KpiPeriod;
  baselineRevenue: number | null;
  onJumpToCalculator: () => void;
  onLoadSample: () => void;
};

const periodsPerYear: Record<KpiPeriod, number> = {
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

const formatPeriods = (value: number | null) => {
  if (value == null) {
    return "—";
  }
  return `${value.toFixed(2)} periods`;
};

const HeroSection = ({
  results,
  analysisPeriod,
  baselineRevenue,
  onJumpToCalculator,
  onLoadSample,
}: HeroSectionProps) => {
  const currentPeriodRevenue =
    baselineRevenue ??
    (results?.projectedRevenueNextYear != null
      ? results.projectedRevenueNextYear / periodsPerYear[analysisPeriod]
      : 100000);

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] px-6 py-8 shadow-[0_40px_120px_rgba(0,0,0,0.45)] sm:px-8 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/8" />
      <div className="pointer-events-none absolute inset-y-0 right-[42%] w-px bg-white/6 max-lg:hidden" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] lg:items-center">
        <div className="space-y-6">
          <div className="space-y-4">
            <Badge
              size="2"
              radius="full"
              variant="surface"
              className="border border-white/12 bg-white/[0.03] text-white/78"
            >
              Software Offer Economics
            </Badge>
            <Heading size="8" className="max-w-3xl text-white">
              Model software revenue like a serious operator, not a spreadsheet.
            </Heading>
            <Text size="3" className="max-w-2xl text-white/62">
              Move from raw inputs to a usable growth answer: unit economics,
              steady-state ceiling, and next-year projection in one workflow.
            </Text>
          </div>

          <Flex gap="3" wrap="wrap">
            <Button
              size="3"
              radius="full"
              variant="solid"
              className="bg-white text-black hover:bg-white/90"
              onClick={onJumpToCalculator}
            >
              Open calculator
            </Button>
            <Button
              size="3"
              radius="full"
              variant="surface"
              className="border border-white/12 bg-white/[0.03] text-white hover:bg-white/[0.06]"
              onClick={onLoadSample}
            >
              Load sample scenario
            </Button>
          </Flex>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              eyebrow="Core ratio"
              value={formatRatio(results?.ltgpToCacRatio ?? null)}
              caption="LTGP:CAC"
            />
            <MetricCard
              eyebrow="Cash recovery"
              value={formatPeriods(results?.cacPaybackPeriods ?? null)}
              caption="CAC payback"
            />
            <MetricCard
              eyebrow="Next-year profit"
              value={formatMoney(results?.projectedProfitNextYear ?? null)}
              caption="Projected profit"
            />
          </div>
        </div>

        <ProjectionHeroChart
          baselineRevenue={currentPeriodRevenue}
          projectedRevenue={results?.projectedRevenueNextYear ?? null}
          ceilingRevenue={results?.hypotheticalMaxRevenuePerYear ?? null}
          periodLabel={analysisPeriod}
        />
      </div>
    </section>
  );
};

const MetricCard = ({
  eyebrow,
  value,
  caption,
}: {
  eyebrow: string;
  value: string;
  caption: string;
}) => {
  return (
    <Card className="rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="space-y-2 p-1">
        <Text size="1" className="uppercase tracking-[0.2em] text-white/40">
          {eyebrow}
        </Text>
        <div className="text-2xl font-semibold tracking-tight text-white">{value}</div>
        <Text size="2" className="text-white/56">
          {caption}
        </Text>
      </div>
    </Card>
  );
};

export default HeroSection;
