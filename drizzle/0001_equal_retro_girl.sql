CREATE TYPE "public"."equipment" AS ENUM('barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell', 'other');--> statement-breakpoint
CREATE TYPE "public"."muscle_group" AS ENUM('chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core', 'forearms');--> statement-breakpoint
CREATE TYPE "public"."split_type" AS ENUM('push', 'pull', 'legs', 'upper', 'lower', 'full', 'custom');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"primary_muscle_group" "muscle_group" NOT NULL,
	"secondary_muscle_groups" "muscle_group"[],
	"equipment" "equipment" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"workout_template_id" uuid,
	"start_time" timestamp with time zone DEFAULT now() NOT NULL,
	"end_time" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sets_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"set_number" integer NOT NULL,
	"weight_kg" numeric(6, 2) NOT NULL,
	"reps_completed" integer NOT NULL,
	"rpe" numeric(3, 1),
	"is_warmup" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "template_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_template_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"default_sets" integer DEFAULT 3 NOT NULL,
	"default_reps" integer DEFAULT 10 NOT NULL,
	"exercise_order" integer NOT NULL,
	"superset_group" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workout_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"split_type" "split_type" DEFAULT 'custom' NOT NULL,
	"estimated_minutes" integer DEFAULT 60 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_workout_template_id_workout_templates_id_fk" FOREIGN KEY ("workout_template_id") REFERENCES "public"."workout_templates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sets_log" ADD CONSTRAINT "sets_log_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sets_log" ADD CONSTRAINT "sets_log_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "template_exercises" ADD CONSTRAINT "template_exercises_workout_template_id_workout_templates_id_fk" FOREIGN KEY ("workout_template_id") REFERENCES "public"."workout_templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "template_exercises" ADD CONSTRAINT "template_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_start_idx" ON "sessions" USING btree ("user_id","start_time" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sets_log_session_idx" ON "sets_log" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sets_log_exercise_completed_idx" ON "sets_log" USING btree ("exercise_id","completed_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "template_exercises_template_order_idx" ON "template_exercises" USING btree ("workout_template_id","exercise_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workout_templates_user_idx" ON "workout_templates" USING btree ("user_id");