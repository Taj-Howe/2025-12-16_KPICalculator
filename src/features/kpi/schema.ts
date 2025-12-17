import { z } from "zod";

export const kpiInputSchema = z.record(z.number());

export type KPIInputSchema = z.infer<typeof kpiInputSchema>;
