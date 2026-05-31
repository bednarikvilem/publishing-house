CREATE TABLE "subscription_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"newspaper_id" uuid NOT NULL,
	"used_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"newspaper_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_newspaper_id_unique" UNIQUE("user_id","newspaper_id")
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "is_subscriber_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_tokens" ADD CONSTRAINT "subscription_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_tokens" ADD CONSTRAINT "subscription_tokens_newspaper_id_newspapers_id_fk" FOREIGN KEY ("newspaper_id") REFERENCES "public"."newspapers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_newspaper_id_newspapers_id_fk" FOREIGN KEY ("newspaper_id") REFERENCES "public"."newspapers"("id") ON DELETE cascade ON UPDATE no action;