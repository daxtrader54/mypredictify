CREATE SCHEMA "predictify";
--> statement-breakpoint
CREATE TYPE "predictify"."acca_status" AS ENUM('pending', 'won', 'lost', 'partial');--> statement-breakpoint
CREATE TYPE "predictify"."gameweek_status" AS ENUM('pending', 'ingested', 'researched', 'predicted', 'evaluated');--> statement-breakpoint
CREATE TYPE "predictify"."pipeline_step" AS ENUM('ingest', 'research', 'predict', 'evaluate', 'report');--> statement-breakpoint
CREATE TYPE "predictify"."pipeline_step_status" AS ENUM('pending', 'running', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "predictify"."tier" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "predictify"."transaction_type" AS ENUM('deduct', 'redeem', 'purchase', 'subscription', 'refund');--> statement-breakpoint
CREATE TABLE "predictify"."acca_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"selections" jsonb NOT NULL,
	"combined_odds" numeric(10, 2) NOT NULL,
	"stake" numeric(10, 2),
	"potential_return" numeric(10, 2),
	"ai_recommendation" text,
	"status" "predictify"."acca_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"settled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "predictify"."credit_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"type" "predictify"."transaction_type" NOT NULL,
	"reason" text,
	"balance_after" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictify"."gameweeks" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"season_id" integer,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"status" "predictify"."gameweek_status" DEFAULT 'pending' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictify"."match_predictions" (
	"id" text PRIMARY KEY NOT NULL,
	"gameweek_id" text NOT NULL,
	"fixture_id" integer NOT NULL,
	"home_team" text NOT NULL,
	"away_team" text NOT NULL,
	"home_win_prob" numeric(5, 3) NOT NULL,
	"draw_prob" numeric(5, 3) NOT NULL,
	"away_win_prob" numeric(5, 3) NOT NULL,
	"predicted_score" text NOT NULL,
	"prediction" text NOT NULL,
	"confidence" numeric(5, 3) NOT NULL,
	"explanation" text,
	"result" text,
	"home_goals" integer,
	"away_goals" integer,
	"log_loss" numeric(8, 4),
	"correct" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictify"."pipeline_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"gameweek_name" text NOT NULL,
	"step" "predictify"."pipeline_step" NOT NULL,
	"status" "predictify"."pipeline_step_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictify"."prediction_views" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fixture_id" integer NOT NULL,
	"league_id" integer NOT NULL,
	"credits_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictify"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"tier" "predictify"."tier" DEFAULT 'free' NOT NULL,
	"credits" integer DEFAULT 100 NOT NULL,
	"has_api_access" boolean DEFAULT false NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"daily_credits_last_reset" timestamp DEFAULT now() NOT NULL,
	"monthly_credits_last_reset" timestamp DEFAULT now() NOT NULL,
	"favorite_leagues" jsonb DEFAULT '[8]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "predictify"."weekly_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"gameweek_id" text NOT NULL,
	"league_id" integer NOT NULL,
	"accuracy" numeric(5, 3),
	"avg_log_loss" numeric(8, 4),
	"brier_score" numeric(8, 4),
	"predictions" integer DEFAULT 0 NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "predictify"."acca_history" ADD CONSTRAINT "acca_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "predictify"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictify"."credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "predictify"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictify"."match_predictions" ADD CONSTRAINT "match_predictions_gameweek_id_gameweeks_id_fk" FOREIGN KEY ("gameweek_id") REFERENCES "predictify"."gameweeks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictify"."prediction_views" ADD CONSTRAINT "prediction_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "predictify"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictify"."weekly_metrics" ADD CONSTRAINT "weekly_metrics_gameweek_id_gameweeks_id_fk" FOREIGN KEY ("gameweek_id") REFERENCES "predictify"."gameweeks"("id") ON DELETE cascade ON UPDATE no action;