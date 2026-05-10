/**
 * Workout generator — fits a template to a target session length.
 *
 * Algorithm (intentionally simple, easy to override):
 *   1. Estimate per-exercise time as
 *        defaultSets * MIN_PER_SET + TRANSITION_MIN
 *   2. Walk the template in `exerciseOrder`. Greedily keep an exercise if
 *      the budget allows. This favours the front of the template, where
 *      compounds typically live.
 *   3. If an exercise *almost* fits, add it with reduced sets (>= 2) so we
 *      still hit the muscle group instead of dropping it entirely.
 *   4. If we finish the loop with slack, extend the LAST kept exercise's
 *      sets by enough to soak up the remaining time.
 *
 * Inputs use the same shape we store in the DB / templates so this can be
 * called both from the API and from a unit-test setting without an HTTP
 * round-trip.
 */

const WARMUP_BUFFER_MIN = 5;
const TRANSITION_MIN = 2; // setup + warmup-of-the-lift between exercises
const MIN_PER_SET = 2.5; // working set + rest

export interface GeneratorExercise {
  exerciseId: string;
  defaultSets: number;
  defaultReps: number;
  exerciseOrder: number;
  supersetGroup: number | null;
}

export interface GeneratorPlanEntry extends GeneratorExercise {
  /** Set count after generator adjustments. */
  plannedSets: number;
}

export interface GeneratorResult {
  plan: GeneratorPlanEntry[];
  dropped: GeneratorExercise[];
  estimatedMinutes: number;
  /** True if the generator made any changes vs. the input template. */
  changed: boolean;
}

function exerciseMinutes(sets: number): number {
  if (sets <= 0) return 0;
  return sets * MIN_PER_SET + TRANSITION_MIN;
}

export function generateWorkout(
  template: GeneratorExercise[],
  targetMinutes: number,
): GeneratorResult {
  const sorted = [...template].sort((a, b) => a.exerciseOrder - b.exerciseOrder);

  const plan: GeneratorPlanEntry[] = [];
  const dropped: GeneratorExercise[] = [];
  let remaining = Math.max(0, targetMinutes - WARMUP_BUFFER_MIN);
  let changed = false;

  for (const ex of sorted) {
    const fullCost = exerciseMinutes(ex.defaultSets);

    if (fullCost <= remaining) {
      plan.push({ ...ex, plannedSets: ex.defaultSets });
      remaining -= fullCost;
      continue;
    }

    // Doesn't fit at full sets — can we reduce?
    const reducedSets = Math.floor((remaining - TRANSITION_MIN) / MIN_PER_SET);
    if (reducedSets >= 2) {
      plan.push({ ...ex, plannedSets: reducedSets });
      remaining = Math.max(0, remaining - exerciseMinutes(reducedSets));
      changed = true;
      continue;
    }

    // Drop this and everything after — earlier exercises are typically the
    // higher-priority compounds.
    dropped.push(ex);
    changed = true;
  }

  // Mark drops for any exercises we never visited because budget hit zero.
  // (The loop above already pushes everything after the first drop into
  // `dropped` since their fullCost won't fit.)

  // Extend the last kept exercise if there's meaningful slack left.
  if (plan.length > 0 && remaining >= MIN_PER_SET) {
    const extraSets = Math.floor(remaining / MIN_PER_SET);
    if (extraSets > 0) {
      const last = plan[plan.length - 1]!;
      const before = last.plannedSets;
      last.plannedSets = before + extraSets;
      remaining -= extraSets * MIN_PER_SET;
      if (last.plannedSets !== last.defaultSets) changed = true;
    }
  }

  // Renumber exerciseOrder so the live screen reads them in order even if
  // intermediate exercises were dropped.
  const renumbered = plan.map((entry, i) => ({ ...entry, exerciseOrder: i }));

  const totalMinutes =
    WARMUP_BUFFER_MIN +
    renumbered.reduce((sum, ex) => sum + exerciseMinutes(ex.plannedSets), 0);

  return {
    plan: renumbered,
    dropped,
    estimatedMinutes: Math.round(totalMinutes),
    changed,
  };
}
