/**
 * Nightly coupon-eligibility scan (02:00 Tehran, off-peak by design).
 *
 * For every ACTIVE campaign: find users who satisfy ALL conditions
 * EXCEPT EXACTLY ONE, and record them as nudge candidates for the
 * 11:00 SMS job the next morning.
 *
 * Peak-safety: evaluation is batched (keyset pagination over users),
 * never one giant query — keeps PG memory flat no matter how big the
 * user table grows.
 *
 * ── TODO (built together in the next step, needs your condition semantics):
 *   1. condition evaluators per type (MIN_ORDERS_COUNT, MIN_TOTAL_SPEND, …)
 *      — one indexed SQL per condition type, joined in a CTE.
 *   2. insert into coupon_nudges with ON CONFLICT DO NOTHING
 *      (unique (user, campaign, scan_date) already guarantees idempotency).
 */
import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../db/client";
import { couponCampaigns, campaignConditions } from "../db/schema";

const USER_BATCH_SIZE = 500;

export class CouponScanJob {
  readonly name = "coupon-eligibility-scan";
  readonly time: string;
  readonly catchUp = true; // must complete before the 11:00 SMS wave

  constructor(
    private readonly deps: { config: { couponScanTime: string }; db: Database },
  ) {
    this.time = deps.config.couponScanTime;
  }

  async run(): Promise<void> {
    const { db } = this.deps.db;

    const campaigns = await db
      .select()
      .from(couponCampaigns)
      .where(
        and(
          eq(couponCampaigns.isActive, true),
          isNull(couponCampaigns.endsAt),
        ),
      );

    if (campaigns.length === 0) {
      console.log("[cron:coupon-scan] no active campaigns — nothing to do");
      return;
    }

    for (const campaign of campaigns) {
      const conditions = await db
        .select()
        .from(campaignConditions)
        .where(eq(campaignConditions.campaignId, campaign.id));

      if (conditions.length === 0) continue;

      console.log(
        `[cron:coupon-scan] campaign "${campaign.title}": ${conditions.length} conditions — ` +
          `TODO evaluate per-user in batches of ${USER_BATCH_SIZE}`,
      );

      // TODO next step:
      // for await (const batch of this.iterUsers(USER_BATCH_SIZE)) {
      //   const evaluated = await this.evaluateBatch(batch, conditions)
      //   // → users where satisfied === conditions.length - 1
      //   // → insert couponNudges ... onConflictDoNothing()
      // }
    }
  }
}