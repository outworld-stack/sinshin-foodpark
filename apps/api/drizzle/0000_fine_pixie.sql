CREATE TYPE "public"."campaign_condition_type" AS ENUM('MIN_ORDERS_COUNT', 'MIN_TOTAL_SPEND', 'MIN_CATEGORY_ORDERS', 'ORDERS_IN_LAST_DAYS');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CUSTOMER', 'ADMIN_L2', 'MAIN_ADMIN');--> statement-breakpoint
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
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(16) NOT NULL,
	"role" "user_role" DEFAULT 'CUSTOMER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "campaign_conditions" ADD CONSTRAINT "campaign_conditions_campaign_id_coupon_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."coupon_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_nudges" ADD CONSTRAINT "coupon_nudges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_nudges" ADD CONSTRAINT "coupon_nudges_campaign_id_coupon_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."coupon_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_nudges" ADD CONSTRAINT "coupon_nudges_missing_condition_id_campaign_conditions_id_fk" FOREIGN KEY ("missing_condition_id") REFERENCES "public"."campaign_conditions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conditions_campaign_idx" ON "campaign_conditions" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaigns_active_idx" ON "coupon_campaigns" USING btree ("is_active","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "nudges_once_per_day" ON "coupon_nudges" USING btree ("user_id","campaign_id","scan_date");--> statement-breakpoint
CREATE INDEX "nudges_pending_idx" ON "coupon_nudges" USING btree ("scan_date","sms_sent_at");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");