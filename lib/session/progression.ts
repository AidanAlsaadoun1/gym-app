/**
 * Last-session-aware "what weight should I do next?" suggestion.
 *
 * Rules (intentionally simple — single-user app, override is one tap away):
 *  - If we have no history for this exercise, return null.
 *  - If the user hit their target reps on every working set last time,
 *    suggest +2.5 kg.
 *  - Otherwise suggest the same weight as last time and tell them to match
 *    the reps.
 */

export interface PreviousSet {
  weightKg: number | null;
  repsCompleted: number;
  isWarmup: boolean;
}

export interface ProgressionSuggestion {
  weightKg: number;
  reps: number;
  reason: "progress" | "match";
  reasonText: string;
}

const DEFAULT_INCREMENT_KG = 2.5;

export function suggestNextWeight(
  previous: PreviousSet[],
  targetReps: number,
  incrementKg = DEFAULT_INCREMENT_KG,
): ProgressionSuggestion | null {
  const working = previous.filter((s) => !s.isWarmup && s.weightKg != null);
  if (working.length === 0) return null;

  // Use the last working set as the reference weight (top set).
  const lastWeight = working[working.length - 1]!.weightKg ?? 0;
  const hitAllReps = working.every((s) => s.repsCompleted >= targetReps);

  if (hitAllReps) {
    return {
      weightKg: round(lastWeight + incrementKg),
      reps: targetReps,
      reason: "progress",
      reasonText: `Hit ${targetReps} on every set last time — bump the load.`,
    };
  }

  return {
    weightKg: round(lastWeight),
    reps: targetReps,
    reason: "match",
    reasonText: `Match last time — aim for ${targetReps} reps.`,
  };
}

function round(value: number): number {
  // 2-decimal rounding so float arithmetic doesn't show 82.500001 etc.
  return Math.round(value * 100) / 100;
}

/** "Last: 80kg × 5,5,4" — short text used as the working-set ghost line. */
export function formatLastSetsLine(previous: PreviousSet[]): string | null {
  const working = previous.filter((s) => !s.isWarmup && s.weightKg != null);
  if (working.length === 0) return null;
  const reps = working.map((s) => s.repsCompleted).join(",");
  // Use the last working set's weight as the headline number.
  const weight = working[working.length - 1]!.weightKg!;
  return `Last: ${weight}kg × ${reps}`;
}
