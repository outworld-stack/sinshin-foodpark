/**
 * Typed, validated, class-based configuration.
 * Fails fast at boot with a clear message listing ALL missing keys.
 */
export type AppEnv = "development" | "production" | "test";

export class AppConfig {
  readonly env: AppEnv;
  readonly port: number;
  readonly host: string;
  readonly logLevel: string;

  readonly databaseUrl: string;
  readonly redisUrl: string;

  readonly jwtSecret: string;

  readonly smsBaseUrl: string;
  readonly smsApiKey: string;
  readonly smsSender: string;

  /** "HH:MM" in Asia/Tehran — nightly off-peak coupon scan */
  readonly couponScanTime: string;
  /** "HH:MM" in Asia/Tehran — pre-lunch nudge SMS */
  readonly couponNudgeTime: string;

  constructor(source: Record<string, string | undefined> = Bun.env) {
    const missing: string[] = [];
    const required = (key: string, fallback?: string): string => {
      const v = source[key] ?? fallback;
      if (v === undefined || v === "") missing.push(key);
      return v as string;
    };

    const env = required("APP_ENV", "development");
    this.env = (["development", "production", "test"] as const).includes(
      env as AppEnv,
    )
      ? (env as AppEnv)
      : "development";

    this.port = Number.parseInt(required("PORT", "3000"), 10);
    this.host = required("HOST", "0.0.0.0");
    this.logLevel = required("LOG_LEVEL", "info");

    // Defaults point at the docker-compose service names (live-server sim).
    // Running outside Docker? Override with localhost hosts.
    this.databaseUrl = required(
      "DATABASE_URL",
      "postgres://sinshin:sinshin_local@postgres:5432/sinshin",
    );
    this.redisUrl = required("REDIS_URL", "redis://redis:6379");

    this.jwtSecret = required("JWT_SECRET", "dev-only-insecure-secret");

    this.smsBaseUrl = required("SMS_BASE_URL", "");
    this.smsApiKey = required("SMS_API_KEY", "");
    this.smsSender = required("SMS_SENDER", "");

    this.couponScanTime = required("COUPON_SCAN_TIME", "02:00");
    this.couponNudgeTime = required("COUPON_NUDGE_TIME", "11:00");

    if (missing.length > 0) {
      // Only truly-required-in-prod keys should land here; defaults above
      // keep local boot effortless. Production must set the real ones.
      if (this.env === "production") {
        throw new Error(
          `[config] missing required env keys: ${missing.join(", ")}`,
        );
      }
    }

    if (
      this.env === "production" &&
      this.jwtSecret === "dev-only-insecure-secret"
    ) {
      throw new Error(
        "[config] JWT_SECRET must be set in production (openssl rand -base64 48)",
      );
    }
  }
}