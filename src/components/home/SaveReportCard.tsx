"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CalculationVersion, KPIResult, KpiPeriod, SubscriptionOfferInput } from "@/features/kpi/types";
import { FieldBlock, SelectField, fieldClassName, pillClassName } from "./form-primitives";

type Evaluation = {
  inputs: SubscriptionOfferInput;
  results: KPIResult;
  calculationVersion: CalculationVersion;
  assumptionsApplied: string[];
};

const pad = (value: number) => String(value).padStart(2, "0");

const defaultPeriodLabelFor = (period: KpiPeriod, date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  if (period === "monthly") {
    return `${year}-${pad(month + 1)}`;
  }
  if (period === "quarterly") {
    const quarter = Math.floor(month / 3) + 1;
    return `${year}-Q${quarter}`;
  }
  return `${year}`;
};

const startOfPeriod = (date: Date, period: KpiPeriod) => {
  const start = new Date(date);
  if (period === "monthly") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === "quarterly") {
    const quarter = Math.floor(start.getMonth() / 3);
    start.setMonth(quarter * 3, 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  return start;
};

const addPeriods = (date: Date, period: KpiPeriod, offset: number) => {
  const next = new Date(date);
  if (period === "monthly") {
    next.setMonth(next.getMonth() + offset);
    return startOfPeriod(next, period);
  }
  if (period === "quarterly") {
    next.setMonth(next.getMonth() + offset * 3);
    return startOfPeriod(next, period);
  }
  next.setFullYear(next.getFullYear() + offset);
  return startOfPeriod(next, period);
};

const endOfPeriod = (start: Date, period: KpiPeriod) => {
  const nextStart = addPeriods(start, period, 1);
  const end = new Date(nextStart.getTime() - 1);
  end.setHours(0, 0, 0, 0);
  return end;
};

const formatRangeDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const quarterLabel = (date: Date) => {
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${quarter}`;
};

const labelForPeriodStart = (start: Date, period: KpiPeriod) => {
  if (period === "monthly") {
    return `${start.getFullYear()}-${pad(start.getMonth() + 1)}`;
  }
  if (period === "quarterly") {
    return quarterLabel(start);
  }
  return `${start.getFullYear()}`;
};

const displayLabelForPeriod = (start: Date, end: Date, period: KpiPeriod) => {
  if (period === "monthly") {
    return `${start.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })} (${formatRangeDate(start)} – ${formatRangeDate(end)})`;
  }
  if (period === "quarterly") {
    const quarter = Math.floor(start.getMonth() / 3) + 1;
    return `Q${quarter} ${start.getFullYear()} (${formatRangeDate(start)} – ${formatRangeDate(end)})`;
  }
  return `${start.getFullYear()} (${formatRangeDate(start)} – ${formatRangeDate(end)})`;
};

type PeriodOption = {
  value: string;
  display: string;
  range: string;
};

const generatePeriodOptions = (period: KpiPeriod, count = 12): PeriodOption[] => {
  const options: PeriodOption[] = [];
  const start = startOfPeriod(new Date(), period);
  for (let i = 0; i < count; i += 1) {
    const currentStart = addPeriods(start, period, -i);
    const end = endOfPeriod(currentStart, period);
    const value = labelForPeriodStart(currentStart, period);
    const display = displayLabelForPeriod(currentStart, end, period);
    options.push({
      value,
      display,
      range: `${formatRangeDate(currentStart)} – ${formatRangeDate(end)}`,
    });
  }
  return options;
};

const SaveReportCard = ({
  evaluation,
  warnings,
}: {
  evaluation: Evaluation;
  warnings: string[];
}) => {
  const [title, setTitle] = useState("");
  const [cohortLabel, setCohortLabel] = useState("");
  const [channel, setChannel] = useState("");
  const periodOptions = useMemo(
    () => generatePeriodOptions(evaluation.inputs.analysisPeriod),
    [evaluation.inputs.analysisPeriod],
  );
  const [periodLabel, setPeriodLabel] = useState(
    () =>
      periodOptions[0]?.value ??
      defaultPeriodLabelFor(evaluation.inputs.analysisPeriod),
  );
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previousPeriodRef = useRef<KpiPeriod>(evaluation.inputs.analysisPeriod);

  useEffect(() => {
    if (
      previousPeriodRef.current !== evaluation.inputs.analysisPeriod ||
      !periodOptions.some((option) => option.value === periodLabel)
    ) {
      previousPeriodRef.current = evaluation.inputs.analysisPeriod;
      setPeriodLabel(
        periodOptions[0]?.value ??
          defaultPeriodLabelFor(evaluation.inputs.analysisPeriod),
      );
    }
  }, [evaluation.inputs.analysisPeriod, periodLabel, periodOptions]);

  const handleSave = async () => {
    const trimmedLabel = periodLabel.trim();
    if (!trimmedLabel) {
      setError("Period label is required.");
      setMessage(null);
      return;
    }
    setStatus("saving");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          cohortLabel: cohortLabel.trim() || undefined,
          channel: channel.trim() || undefined,
          periodLabel: trimmedLabel,
          inputs: evaluation.inputs,
          results: evaluation.results,
          warnings,
          calculationVersion: evaluation.calculationVersion,
          assumptionsApplied: evaluation.assumptionsApplied,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          throw new Error("A report already exists for that period label.");
        }
        throw new Error(data.error ?? "Failed to save report.");
      }
      setMessage("Report saved.");
      setTitle("");
      setCohortLabel("");
      setChannel("");
      setPeriodLabel(
        periodOptions[0]?.value ??
          defaultPeriodLabelFor(evaluation.inputs.analysisPeriod),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <section className="panel-shell rounded-[26px] p-5 text-white">
      <div className="border-b border-white/8 pb-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/34">
          03 Capture Scenario
        </p>
        <h3 className="mt-2 text-lg font-semibold">Save report snapshot</h3>
        <p className="mt-1 text-sm text-white/58">
          Tag this scenario so you can track how the offer changes over time.
        </p>
        <div className="mt-3 text-xs text-white/46">
          <p>Calculation version: {evaluation.calculationVersion}</p>
          {evaluation.assumptionsApplied.length > 0 && (
            <p>Assumptions: {evaluation.assumptionsApplied.join(" | ")}</p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <FieldBlock label="Title (optional)">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={fieldClassName}
          />
        </FieldBlock>
        <FieldBlock label="Channel (optional)">
          <input
            type="text"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            className={fieldClassName}
          />
        </FieldBlock>
        <FieldBlock label="Cohort label (optional)">
          <input
            type="text"
            value={cohortLabel}
            onChange={(event) => setCohortLabel(event.target.value)}
            className={fieldClassName}
          />
        </FieldBlock>
        <FieldBlock
          label="Period label (required)"
          helper={
            periodOptions.find((option) => option.value === periodLabel)?.range ??
            "Select a period"
          }
        >
          <SelectField
            value={periodLabel}
            onChange={(event) => setPeriodLabel(event.target.value)}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.display}
              </option>
            ))}
          </SelectField>
        </FieldBlock>
      </div>

      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving"}
          className={`${pillClassName} px-4 py-2 disabled:opacity-50 disabled:hover:border-white/16 disabled:hover:bg-white/[0.018] disabled:hover:text-white`}
        >
          {status === "saving" ? "Saving..." : "Save report"}
        </button>
        {message && <span className="text-sm text-white/64">{message}</span>}
        {error && <span className="text-sm text-white/64">{error}</span>}
      </div>
    </section>
  );
};

export default SaveReportCard;
