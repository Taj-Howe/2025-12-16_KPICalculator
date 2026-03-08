"use client";

import { buildAnalysisReport } from "@/features/kpi/analysis";
import { evaluateKpis } from "@/features/kpi/service";
import type { KpiEvaluation, KpiPeriod } from "@/features/kpi/types";
import { mapSnapshotToCalculatorInput } from "@/features/integrations/service";
import type { NormalizedOfferPeriodSnapshot } from "@/features/integrations/types";

export type ImportedAnalyticsView =
  | "revenue"
  | "profit"
  | "retention"
  | "payback"
  | "margin"
  | "upside";

export type ImportedSnapshotEvaluation = {
  snapshot: NormalizedOfferPeriodSnapshot;
  evaluation: KpiEvaluation | null;
  warnings: string[];
  assumptionsApplied: string[];
  unmappedFields: string[];
};

export type ImportedOfferAnalytics = {
  offerKey: string;
  offerName: string;
  offerType: NormalizedOfferPeriodSnapshot["offerType"];
  analysisPeriod: KpiPeriod;
  snapshots: NormalizedOfferPeriodSnapshot[];
  labels: string[];
  evaluations: ImportedSnapshotEvaluation[];
  latestSnapshot: NormalizedOfferPeriodSnapshot;
  latestEvaluation: ImportedSnapshotEvaluation | null;
  latestAnalysisReport: ReturnType<typeof buildAnalysisReport> | null;
};

const quarterForDate = (date: Date) => Math.floor(date.getMonth() / 3) + 1;

export const formatSnapshotLabel = (
  snapshot: NormalizedOfferPeriodSnapshot,
): string => {
  const end = new Date(snapshot.windowEnd);
  if (snapshot.analysisPeriod === "monthly") {
    return end.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  if (snapshot.analysisPeriod === "quarterly") {
    return `Q${quarterForDate(end)} ${end.getFullYear()}`;
  }
  return end.getFullYear().toString();
};

export const deriveSnapshotRevenue = (
  snapshot: NormalizedOfferPeriodSnapshot,
): number | null =>
  snapshot.revenue.recognizedRevenueApprox ??
  snapshot.revenue.netReceipts ??
  snapshot.revenue.grossReceipts;

export const deriveSnapshotProfit = (
  snapshot: NormalizedOfferPeriodSnapshot,
): number | null => {
  const revenue = deriveSnapshotRevenue(snapshot);
  const margin = snapshot.delivery.observableGrossMargin;
  if (revenue == null || margin == null) {
    return null;
  }
  return revenue * margin;
};

export const deriveRefundRate = (
  snapshot: NormalizedOfferPeriodSnapshot,
): number | null => {
  const gross = snapshot.revenue.grossReceipts;
  const refunds = snapshot.revenue.refunds;
  if (gross == null || refunds == null || gross <= 0) {
    return null;
  }
  return refunds / gross;
};

export const buildImportedSnapshotEvaluations = (
  snapshots: NormalizedOfferPeriodSnapshot[],
): ImportedSnapshotEvaluation[] => {
  return snapshots.map((snapshot) => {
    const mapped = mapSnapshotToCalculatorInput(snapshot);
    if (mapped.offerInput == null) {
      return {
        snapshot,
        evaluation: null,
        warnings: mapped.warnings,
        assumptionsApplied: mapped.assumptionsApplied,
        unmappedFields: mapped.unmappedFields,
      };
    }

    const evaluation = evaluateKpis(mapped.offerInput);
    return {
      snapshot,
      evaluation,
      warnings: mapped.warnings,
      assumptionsApplied: mapped.assumptionsApplied,
      unmappedFields: mapped.unmappedFields,
    };
  });
};

export const buildImportedOfferAnalytics = (
  snapshots: NormalizedOfferPeriodSnapshot[],
): ImportedOfferAnalytics[] => {
  const groups = new Map<string, NormalizedOfferPeriodSnapshot[]>();
  for (const snapshot of snapshots) {
    const existing = groups.get(snapshot.offerKey);
    if (existing) {
      existing.push(snapshot);
    } else {
      groups.set(snapshot.offerKey, [snapshot]);
    }
  }

  return [...groups.entries()]
    .map(([, groupedSnapshots]) => {
      const ordered = [...groupedSnapshots].sort((left, right) =>
        left.windowStart.localeCompare(right.windowStart),
      );
      const evaluations = buildImportedSnapshotEvaluations(ordered);
      const latestSnapshot = ordered[ordered.length - 1];
      const latestEvaluation =
        [...evaluations].reverse().find((entry) => entry.evaluation != null) ?? null;
      const latestAnalysisReport =
        latestEvaluation?.evaluation != null
          ? buildAnalysisReport({ evaluation: latestEvaluation.evaluation })
          : null;

      return {
        offerKey: latestSnapshot.offerKey,
        offerName: latestSnapshot.offerName,
        offerType: latestSnapshot.offerType,
        analysisPeriod: latestSnapshot.analysisPeriod,
        snapshots: ordered,
        labels: ordered.map(formatSnapshotLabel),
        evaluations,
        latestSnapshot,
        latestEvaluation,
        latestAnalysisReport,
      };
    })
    .sort((left, right) => left.offerName.localeCompare(right.offerName));
};
