import type { AppConfig } from "../../config/env";

/**
 * SMS gateway adapter — YOUR provider, called via Bun.fetch.
 *
 * The two cron jobs (and later: OTP login) go through this class only.
 * Real HTTP wiring lands in the next step once we plug in your
 * gateway's exact endpoints/auth; the interface is already final.
 */
export class SmsService {
  constructor(private readonly config: AppConfig) {}

  describe(): string {
    return this.config.smsBaseUrl ? "real gateway" : "stub (logging only)";
  }

  async send(phone: string, message: string): Promise<boolean> {
    if (!this.config.smsBaseUrl || !this.config.smsApiKey) {
      // stub mode — log clearly so local dev needs no real credentials
      console.log(`[sms:stub] -> ${phone}: ${message}`);
      return true;
    }

    try {
      const res = await Bun.fetch(`${this.config.smsBaseUrl}/send`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.smsApiKey}`,
        },
        body: JSON.stringify({
          from: this.config.smsSender,
          to: phone,
          text: message,
        }),
      });
      if (!res.ok) {
        console.error(`[sms] gateway ${res.status} for ${phone}`);
        return false;
      }
      return true;
    } catch (err) {
      console.error(`[sms] gateway unreachable for ${phone}:`, err);
      return false;
    }
  }
}
