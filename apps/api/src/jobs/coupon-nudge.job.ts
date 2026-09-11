/**
 * Pre-lunch nudge SMS (11:00 Tehran — before the lunch rush).
 *
 * Sends "you're ONE condition away from the coupon" to everyone the
 * nightly scan identified. Idempotent by construction:
 *   - only rows with scan_date = today AND sms_sent_at IS NULL are picked
 *   - the update flips sms_sent_at FIRST (claim), SMS goes second
 *   - unique (user, campaign, scan_date) → no duplicate even across replicas
 *   - after 13:00 we stop sending (a post-lunch nudge is pointless)
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { couponNudges, users, couponCampaigns } from "../db/schema";
import type { SmsService } from "../modules/sms/sms.service";

const DEADLINE_HOUR = 13; // Tehran — no nudges after lunch

export class CouponNudgeSmsJob {
  readonly name = "coupon-nudge-sms";
  readonly time: string;
  readonly catchUp = false;

  constructor(
    private readonly deps: {
      config: { couponNudgeTime: string };
      db: Database;
      sms: SmsService;
    },
  ) {
    this.time = deps.config.couponNudgeTime;
  }

  async run(): Promise<void> {
    const hour = Number.parseInt(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Tehran",
        hour: "2-digit",
        hour12: false,
      }).format(new Date()),
      10,
    );
    if (hour >= DEADLINE_HOUR) {
      console.log("[cron:coupon-nudge] past 13:00 Tehran — skipping today");
      return;
    }

    const { db } = this.deps.db;

    // pending nudges for today, with everything needed to compose the SMS
    const pending = await db
      .select({
        nudgeId: couponNudges.id,
        phone: users.phone,
        campaignTitle: couponCampaigns.title,
        missingCount: couponNudges.missingCount,
      })
      .from(couponNudges)
      .innerJoin(users, eq(users.id, couponNudges.userId))
      .innerJoin(
        couponCampaigns,
        eq(couponCampaigns.id, couponNudges.campaignId),
      )
      .where(
        and(
          sql`${couponNudges.scanDate} = CURRENT_DATE`,
          isNull(couponNudges.smsSentAt),
        ),
      );

    let sent = 0;
    for (const row of pending) {
      // claim the row first → crash-safe, replica-safe
      const claimed = await db
        .update(couponNudges)
        .set({ smsSentAt: new Date() })
        .where(
          and(eq(couponNudges.id, row.nudgeId), isNull(couponNudges.smsSentAt)),
        )
        .returning({ id: couponNudges.id });
      if (claimed.length === 0) continue; // another replica took it

      const gap =
        row.missingCount && row.missingCount > 1
          ? `${row.missingCount} قدم`
          : "یک قدم";

      const ok = await this.deps.sms.send(
        row.phone,
        `${gap} تا رسیدن به کوپن تخفیف «${row.campaignTitle}» فاصله دارید! ` +
          `سفارش بعدی‌تان را ثبت کنید تا شانس دریافت کوپن را از دست ندهید.`,
      );
      if (ok) sent++;
    }

    console.log(
      `[cron:coupon-nudge] sent ${sent}/${pending.length} nudge SMS (gateway: ${this.deps.sms.describe()})`,
    );
  }
}