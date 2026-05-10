import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*                              better-auth tables                             */
/* -------------------------------------------------------------------------- */

/**
 * Column names and types follow the canonical schema expected by better-auth's
 * Drizzle adapter. Do not rename fields without updating the adapter mapping.
 */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*                                  enums                                      */
/* -------------------------------------------------------------------------- */

export const muscleGroupEnum = pgEnum("muscle_group", [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "forearms",
]);

export const equipmentEnum = pgEnum("equipment", [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bodyweight",
  "kettlebell",
  "other",
]);

export const splitTypeEnum = pgEnum("split_type", [
  "push",
  "pull",
  "legs",
  "upper",
  "lower",
  "full",
  "custom",
]);

/* -------------------------------------------------------------------------- */
/*                              app tables                                     */
/* -------------------------------------------------------------------------- */

/**
 * Global exercise library — pre-seeded by `pnpm db:seed`. No userId today,
 * since this is a single-user app; if/when we add custom user exercises,
 * we'll add a nullable `userId` column rather than splitting the table.
 */
export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  primaryMuscleGroup: muscleGroupEnum("primary_muscle_group").notNull(),
  // Postgres array of muscleGroupEnum. Nullable — most isolation lifts
  // don't need this filled in.
  secondaryMuscleGroups: muscleGroupEnum("secondary_muscle_groups").array(),
  equipment: equipmentEnum("equipment").notNull(),
  // Optional media. When null the UI falls back to a YouTube-search link
  // built from the exercise name (lib/exercises/media.ts) and a placeholder
  // icon for the image. A future "edit exercise" screen lets the user
  // curate these.
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workoutTemplates = pgTable(
  "workout_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    splitType: splitTypeEnum("split_type").notNull().default("custom"),
    estimatedMinutes: integer("estimated_minutes").notNull().default(60),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("workout_templates_user_idx").on(t.userId)],
);

export const templateExercises = pgTable(
  "template_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutTemplateId: uuid("workout_template_id")
      .notNull()
      .references(() => workoutTemplates.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    defaultSets: integer("default_sets").notNull().default(3),
    defaultReps: integer("default_reps").notNull().default(10),
    exerciseOrder: integer("exercise_order").notNull(),
    // Exercises sharing the same supersetGroup number within a template are
    // performed back-to-back. Null = standalone exercise.
    supersetGroup: integer("superset_group"),
  },
  (t) => [
    index("template_exercises_template_order_idx").on(t.workoutTemplateId, t.exerciseOrder),
  ],
);

/**
 * Snapshot of the exercise plan for a session. When set, the live screen
 * uses this list instead of the template's current `template_exercises`,
 * which means: (1) the generator can produce a one-off trimmed list
 * without mutating the template, and (2) editing a template later doesn't
 * retroactively change what an old session was supposed to be.
 */
export interface SessionPlanEntry {
  exerciseId: string;
  defaultSets: number;
  defaultReps: number;
  exerciseOrder: number;
  supersetGroup: number | null;
}

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Null when the user logs an ad-hoc session not tied to a template.
    workoutTemplateId: uuid("workout_template_id").references(
      () => workoutTemplates.id,
      { onDelete: "set null" },
    ),
    startTime: timestamp("start_time", { withTimezone: true }).notNull().defaultNow(),
    // Null while the session is in progress; set in a transaction on finish.
    endTime: timestamp("end_time", { withTimezone: true }),
    notes: text("notes"),
    // Generated / explicitly-snapshotted plan. Null = derive from the
    // template's current exercise list at render time.
    plan: jsonb("plan").$type<SessionPlanEntry[] | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // "Recent sessions" — ordered scan by user.
    index("sessions_user_start_idx").on(t.userId, sql`${t.startTime} DESC`),
  ],
);

export const setsLog = pgTable(
  "sets_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    setNumber: integer("set_number").notNull(),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }).notNull(),
    repsCompleted: integer("reps_completed").notNull(),
    rpe: numeric("rpe", { precision: 3, scale: 1 }),
    isWarmup: boolean("is_warmup").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("sets_log_session_idx").on(t.sessionId),
    // "Last time I did exercise X" — newest set per exercise.
    index("sets_log_exercise_completed_idx").on(t.exerciseId, sql`${t.completedAt} DESC`),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                  types                                      */
/* -------------------------------------------------------------------------- */

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;

export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;
export type NewWorkoutTemplate = typeof workoutTemplates.$inferInsert;

export type TemplateExercise = typeof templateExercises.$inferSelect;
export type NewTemplateExercise = typeof templateExercises.$inferInsert;

export type WorkoutSession = typeof sessions.$inferSelect;
export type NewWorkoutSession = typeof sessions.$inferInsert;

export type SetLog = typeof setsLog.$inferSelect;
export type NewSetLog = typeof setsLog.$inferInsert;

export type MuscleGroup = (typeof muscleGroupEnum.enumValues)[number];
export type Equipment = (typeof equipmentEnum.enumValues)[number];
export type SplitType = (typeof splitTypeEnum.enumValues)[number];
