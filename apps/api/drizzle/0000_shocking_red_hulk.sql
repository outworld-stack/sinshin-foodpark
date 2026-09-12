CREATE TYPE "public"."campaign_condition_type" AS ENUM('MIN_ORDERS_COUNT', 'MIN_TOTAL_SPEND', 'MIN_CATEGORY_ORDERS', 'ORDERS_IN_LAST_DAYS');--> statement-breakpoint
CREATE TABLE "campaign_conditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"type" "campaign_condition_type" NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(120) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_nudges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"missing_condition_id" uuid NOT NULL,
	"missing_count" integer,
	"scan_date" date NOT NULL,
	"sms_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"fingerprint" varchar(64) NOT NULL,
	"name" text DEFAULT 'دستگاه بدون نام' NOT NULL,
	"platform" varchar(20) DEFAULT 'web' NOT NULL,
	"user_agent" text,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(11) NOT NULL,
	"name" text,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"banned_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"refresh_hash" varchar(64) NOT NULL,
	"ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rotated_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" varchar(30)
);
--> statement-breakpoint
ALTER TABLE "campaign_conditions" ADD CONSTRAINT "campaign_conditions_campaign_id_coupon_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."coupon_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_nudges" ADD CONSTRAINT "coupon_nudges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_nudges" ADD CONSTRAINT "coupon_nudges_campaign_id_coupon_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."coupon_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_nudges" ADD CONSTRAINT "coupon_nudges_missing_condition_id_campaign_conditions_id_fk" FOREIGN KEY ("missing_condition_id") REFERENCES "public"."campaign_conditions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conditions_campaign_idx" ON "campaign_conditions" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaigns_active_idx" ON "coupon_campaigns" USING btree ("is_active","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "nudges_once_per_day" ON "coupon_nudges" USING btree ("user_id","campaign_id","scan_date");--> statement-breakpoint
CREATE INDEX "nudges_pending_idx" ON "coupon_nudges" USING btree ("scan_date","sms_sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "devices_user_fingerprint_key" ON "devices" USING btree ("user_id","fingerprint");--> statement-breakpoint
CREATE INDEX "devices_user_idx" ON "devices" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_key" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "users_token_version_idx" ON "users" USING btree ("token_version");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_refresh_hash_key" ON "sessions" USING btree ("refresh_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_device_idx" ON "sessions" USING btree ("device_id");