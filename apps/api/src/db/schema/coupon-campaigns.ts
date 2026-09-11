import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { CampaignId, ConditionId } from "../../types/brand";
import { users } from "./users";

/**
 * Coupon campaigns — a published discount with N conditions.
 * A user who satisfies ALL conditions receives the coupon.
 *
 * The nightly job finds users satisfying (N - 1) of N conditions
 * and queues a pre-lunch SMS nudge for the next day.
 */
export const campaignConditionTypeEnum = pgEnum("campaign_condition_type", [
  "MIN_ORDERS_COUNT", // params: { count }
  "MIN_TOTAL_SPEND", // params: { amount }
  "MIN_CATEGORY_ORDERS", // params: { category, count }
  "ORDERS_IN_LAST_DAYS", // params: { days, count }
]);

export const couponCampaigns = pgTable(
  "coupon_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey().$type<CampaignId>(),
    title: varchar("title", { length: 120 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("campaigns_active_idx").on(t.isActive, t.startsAt, t.endsAt)],
);

export const campaignConditions = pgTable(
  "campaign_conditions",
  {
    id: uuid("id").defaultRandom().primaryKey().$type<ConditionId>(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => couponCampaigns.id, { onDelete: "cascade" }),
    type: campaignConditionTypeEnum("type").notNull(),
    params: jsonb("params").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("conditions_campaign_idx").on(t.campaignId)],
);

/**
 * Rows written by the nightly scan, consumed by the 11:00 SMS job.
 * UNIQUE (user, campaign, scan_date) → a user is nudged at most once
 * per campaign per day, even across api replicas (idempotency).
 */
export const couponNudges = pgTable(
  "coupon_nudges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => couponCampaigns.id, { onDelete: "cascade" }),
    missingConditionId: uuid("missing_condition_id")
      .notNull()
      .references(() => campaignConditions.id, { onDelete: "cascade" }),
    missingCount: integer("missing_count"), // e.g. "2 more orders to go"
    scanDate: date("scan_date").notNull(),
    smsSentAt: timestamp("sms_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("nudges_once_per_day").on(t.userId, t.campaignId, t.scanDate),
    index("nudges_pending_idx").on(t.scanDate, t.smsSentAt),
  ],
);