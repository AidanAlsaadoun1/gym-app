/**
 * Seed the global exercise library.
 *
 * Idempotent — uses ON CONFLICT (name) DO NOTHING. Safe to re-run after
 * adding new exercises to the list below; existing rows aren't touched.
 *
 * Run via:
 *   pnpm db:seed
 *
 * Env vars are loaded by tsx via `--env-file=.env.local` (see package.json).
 */
import { db } from "./index";
import { exercises, type NewExercise } from "./schema";

type SeedExercise = Omit<NewExercise, "id" | "createdAt">;

const EXERCISES: SeedExercise[] = [
  /* -------- chest -------- */
  { name: "Barbell Bench Press", primaryMuscleGroup: "chest", secondaryMuscleGroups: ["triceps", "shoulders"], equipment: "barbell" },
  { name: "Incline Barbell Bench Press", primaryMuscleGroup: "chest", secondaryMuscleGroups: ["shoulders", "triceps"], equipment: "barbell" },
  { name: "Decline Barbell Bench Press", primaryMuscleGroup: "chest", secondaryMuscleGroups: ["triceps"], equipment: "barbell" },
  { name: "Dumbbell Bench Press", primaryMuscleGroup: "chest", secondaryMuscleGroups: ["triceps", "shoulders"], equipment: "dumbbell" },
  { name: "Incline Dumbbell Press", primaryMuscleGroup: "chest", secondaryMuscleGroups: ["shoulders", "triceps"], equipment: "dumbbell" },
  { name: "Dumbbell Fly", primaryMuscleGroup: "chest", equipment: "dumbbell" },
  { name: "Cable Fly", primaryMuscleGroup: "chest", equipment: "cable" },
  { name: "Pec Deck", primaryMuscleGroup: "chest", equipment: "machine" },
  { name: "Push-up", primaryMuscleGroup: "chest", secondaryMuscleGroups: ["triceps", "shoulders", "core"], equipment: "bodyweight" },
  { name: "Dip", primaryMuscleGroup: "chest", secondaryMuscleGroups: ["triceps", "shoulders"], equipment: "bodyweight" },

  /* -------- back -------- */
  { name: "Conventional Deadlift", primaryMuscleGroup: "back", secondaryMuscleGroups: ["hamstrings", "glutes", "forearms"], equipment: "barbell" },
  { name: "Sumo Deadlift", primaryMuscleGroup: "back", secondaryMuscleGroups: ["quads", "glutes", "forearms"], equipment: "barbell" },
  { name: "Pull-up", primaryMuscleGroup: "back", secondaryMuscleGroups: ["biceps"], equipment: "bodyweight" },
  { name: "Chin-up", primaryMuscleGroup: "back", secondaryMuscleGroups: ["biceps"], equipment: "bodyweight" },
  { name: "Lat Pulldown", primaryMuscleGroup: "back", secondaryMuscleGroups: ["biceps"], equipment: "cable" },
  { name: "Barbell Row", primaryMuscleGroup: "back", secondaryMuscleGroups: ["biceps", "forearms"], equipment: "barbell" },
  { name: "Pendlay Row", primaryMuscleGroup: "back", secondaryMuscleGroups: ["biceps", "forearms"], equipment: "barbell" },
  { name: "Dumbbell Row", primaryMuscleGroup: "back", secondaryMuscleGroups: ["biceps"], equipment: "dumbbell" },
  { name: "T-Bar Row", primaryMuscleGroup: "back", secondaryMuscleGroups: ["biceps"], equipment: "barbell" },
  { name: "Seated Cable Row", primaryMuscleGroup: "back", secondaryMuscleGroups: ["biceps"], equipment: "cable" },
  { name: "Face Pull", primaryMuscleGroup: "back", secondaryMuscleGroups: ["shoulders"], equipment: "cable" },
  { name: "Straight-Arm Pulldown", primaryMuscleGroup: "back", equipment: "cable" },

  /* -------- shoulders -------- */
  { name: "Overhead Press", primaryMuscleGroup: "shoulders", secondaryMuscleGroups: ["triceps"], equipment: "barbell" },
  { name: "Seated Dumbbell Press", primaryMuscleGroup: "shoulders", secondaryMuscleGroups: ["triceps"], equipment: "dumbbell" },
  { name: "Arnold Press", primaryMuscleGroup: "shoulders", secondaryMuscleGroups: ["triceps"], equipment: "dumbbell" },
  { name: "Dumbbell Lateral Raise", primaryMuscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Cable Lateral Raise", primaryMuscleGroup: "shoulders", equipment: "cable" },
  { name: "Front Raise", primaryMuscleGroup: "shoulders", equipment: "dumbbell" },
  { name: "Reverse Pec Deck", primaryMuscleGroup: "shoulders", equipment: "machine" },
  { name: "Rear Delt Fly", primaryMuscleGroup: "shoulders", equipment: "dumbbell" },

  /* -------- biceps -------- */
  { name: "Barbell Curl", primaryMuscleGroup: "biceps", secondaryMuscleGroups: ["forearms"], equipment: "barbell" },
  { name: "Dumbbell Curl", primaryMuscleGroup: "biceps", secondaryMuscleGroups: ["forearms"], equipment: "dumbbell" },
  { name: "Hammer Curl", primaryMuscleGroup: "biceps", secondaryMuscleGroups: ["forearms"], equipment: "dumbbell" },
  { name: "Preacher Curl", primaryMuscleGroup: "biceps", equipment: "barbell" },
  { name: "Cable Curl", primaryMuscleGroup: "biceps", equipment: "cable" },
  { name: "Incline Dumbbell Curl", primaryMuscleGroup: "biceps", equipment: "dumbbell" },
  { name: "Concentration Curl", primaryMuscleGroup: "biceps", equipment: "dumbbell" },
  { name: "EZ-Bar Curl", primaryMuscleGroup: "biceps", secondaryMuscleGroups: ["forearms"], equipment: "barbell" },

  /* -------- triceps -------- */
  { name: "Close-Grip Bench Press", primaryMuscleGroup: "triceps", secondaryMuscleGroups: ["chest", "shoulders"], equipment: "barbell" },
  { name: "Skullcrusher", primaryMuscleGroup: "triceps", equipment: "barbell" },
  { name: "Tricep Pushdown", primaryMuscleGroup: "triceps", equipment: "cable" },
  { name: "Overhead Tricep Extension", primaryMuscleGroup: "triceps", equipment: "dumbbell" },
  { name: "Cable Overhead Tricep Extension", primaryMuscleGroup: "triceps", equipment: "cable" },
  { name: "Tricep Kickback", primaryMuscleGroup: "triceps", equipment: "dumbbell" },

  /* -------- quads -------- */
  { name: "Back Squat", primaryMuscleGroup: "quads", secondaryMuscleGroups: ["glutes", "hamstrings", "core"], equipment: "barbell" },
  { name: "Front Squat", primaryMuscleGroup: "quads", secondaryMuscleGroups: ["glutes", "core"], equipment: "barbell" },
  { name: "Hack Squat", primaryMuscleGroup: "quads", secondaryMuscleGroups: ["glutes"], equipment: "machine" },
  { name: "Leg Press", primaryMuscleGroup: "quads", secondaryMuscleGroups: ["glutes", "hamstrings"], equipment: "machine" },
  { name: "Bulgarian Split Squat", primaryMuscleGroup: "quads", secondaryMuscleGroups: ["glutes", "hamstrings"], equipment: "dumbbell" },
  { name: "Walking Lunge", primaryMuscleGroup: "quads", secondaryMuscleGroups: ["glutes", "hamstrings"], equipment: "dumbbell" },
  { name: "Goblet Squat", primaryMuscleGroup: "quads", secondaryMuscleGroups: ["glutes", "core"], equipment: "dumbbell" },
  { name: "Leg Extension", primaryMuscleGroup: "quads", equipment: "machine" },
  { name: "Step-up", primaryMuscleGroup: "quads", secondaryMuscleGroups: ["glutes"], equipment: "dumbbell" },

  /* -------- hamstrings -------- */
  { name: "Romanian Deadlift", primaryMuscleGroup: "hamstrings", secondaryMuscleGroups: ["glutes", "back"], equipment: "barbell" },
  { name: "Stiff-Leg Deadlift", primaryMuscleGroup: "hamstrings", secondaryMuscleGroups: ["glutes", "back"], equipment: "barbell" },
  { name: "Lying Leg Curl", primaryMuscleGroup: "hamstrings", equipment: "machine" },
  { name: "Seated Leg Curl", primaryMuscleGroup: "hamstrings", equipment: "machine" },
  { name: "Glute-Ham Raise", primaryMuscleGroup: "hamstrings", secondaryMuscleGroups: ["glutes"], equipment: "bodyweight" },
  { name: "Good Morning", primaryMuscleGroup: "hamstrings", secondaryMuscleGroups: ["glutes", "back"], equipment: "barbell" },
  { name: "Nordic Curl", primaryMuscleGroup: "hamstrings", equipment: "bodyweight" },

  /* -------- glutes -------- */
  { name: "Barbell Hip Thrust", primaryMuscleGroup: "glutes", secondaryMuscleGroups: ["hamstrings"], equipment: "barbell" },
  { name: "Glute Bridge", primaryMuscleGroup: "glutes", equipment: "bodyweight" },
  { name: "Cable Glute Kickback", primaryMuscleGroup: "glutes", equipment: "cable" },
  { name: "Sumo Squat", primaryMuscleGroup: "glutes", secondaryMuscleGroups: ["quads"], equipment: "dumbbell" },

  /* -------- calves -------- */
  { name: "Standing Calf Raise", primaryMuscleGroup: "calves", equipment: "machine" },
  { name: "Seated Calf Raise", primaryMuscleGroup: "calves", equipment: "machine" },
  { name: "Calf Press", primaryMuscleGroup: "calves", equipment: "machine" },
  { name: "Single-Leg Calf Raise", primaryMuscleGroup: "calves", equipment: "dumbbell" },

  /* -------- core -------- */
  { name: "Plank", primaryMuscleGroup: "core", equipment: "bodyweight" },
  { name: "Hanging Leg Raise", primaryMuscleGroup: "core", equipment: "bodyweight" },
  { name: "Cable Crunch", primaryMuscleGroup: "core", equipment: "cable" },
  { name: "Russian Twist", primaryMuscleGroup: "core", equipment: "dumbbell" },
  { name: "Ab Wheel Rollout", primaryMuscleGroup: "core", equipment: "other" },
  { name: "Decline Sit-up", primaryMuscleGroup: "core", equipment: "bodyweight" },

  /* -------- forearms -------- */
  { name: "Wrist Curl", primaryMuscleGroup: "forearms", equipment: "barbell" },
  { name: "Reverse Wrist Curl", primaryMuscleGroup: "forearms", equipment: "barbell" },
  { name: "Reverse Curl", primaryMuscleGroup: "forearms", secondaryMuscleGroups: ["biceps"], equipment: "barbell" },
  { name: "Farmer's Walk", primaryMuscleGroup: "forearms", secondaryMuscleGroups: ["core", "back"], equipment: "dumbbell" },
];

async function main() {
  console.log(`Seeding ${EXERCISES.length} exercises…`);

  const result = await db
    .insert(exercises)
    .values(EXERCISES)
    .onConflictDoNothing({ target: exercises.name })
    .returning({ id: exercises.id, name: exercises.name });

  console.log(
    `Inserted ${result.length} new exercises. ${EXERCISES.length - result.length} already existed.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
