import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const kpiReports = pgTable(
  "kpi_reports",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    title: text("title"),
    cohortLabel: text("cohort_label"),
    channel: text("channel"),
    period: text("period").notNull(),
    periodLabel: text("period_label"),
    businessModel: text("business_model").notNull(),
    offerId: text("offer_id"),
    offerName: text("offer_name"),
    offerType: text("offer_type"),
    calculationVersion: text("calculation_version"),
    inputJson: jsonb("input_json").notNull(),
    resultJson: jsonb("result_json").notNull(),
    warningsJson: jsonb("warnings_json").notNull(),
  },
  (table) => ({
    userPeriodLabelUnique: uniqueIndex(
      "kpi_reports_user_period_label_unique",
    ).on(table.userId, table.period, table.periodLabel),
  }),
);

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});
