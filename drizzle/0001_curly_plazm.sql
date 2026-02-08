ALTER TYPE "predictify"."tier" ADD VALUE 'gold';--> statement-breakpoint
CREATE TABLE "predictify"."league_standings" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" integer NOT NULL,
	"season_id" integer NOT NULL,
	"position" integer NOT NULL,
	"team_id" integer NOT NULL,
	"team_name" text NOT NULL,
	"team_logo" text,
	"played" integer DEFAULT 0 NOT NULL,
	"won" integer DEFAULT 0 NOT NULL,
	"drawn" integer DEFAULT 0 NOT NULL,
	"lost" integer DEFAULT 0 NOT NULL,
	"goals_for" integer DEFAULT 0 NOT NULL,
	"goals_against" integer DEFAULT 0 NOT NULL,
	"goal_difference" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
