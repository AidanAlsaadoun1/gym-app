import { suggestNextWeight } from "@/lib/session/progression";
import type { ExerciseRow, LastSets, LoggedSet } from "@/lib/session/types";
import type { SetDraft } from "./set-row";

export interface ResolvedRow {
  rowIndex: number;
  warmup: boolean;
  /** Ordinal within its own kind — working sets count separately from warmups. */
  displayNumber: number;
  /** Matching set from the last session, for the "previous" column. */
  previous: { weightKg: number; repsCompleted: number } | null;
  /** What the row logs if the user checks it without typing anything. */
  fill: { weight: number; reps: number };
}

/**
 * Pairs each set row with its ordinal and its counterpart from last session.
 *
 * Shared by the exercise card and the logger so the two can't disagree: the
 * number shown in the "previous" column is exactly the number that gets logged
 * when the row is checked, warmups included. Warmups are indexed against
 * previous warmups and working sets against previous working sets — otherwise a
 * warmup at the top of the list shifts every working row's history by one.
 */
export function resolveRows({
  exercise,
  logged,
  previous,
  drafts,
  rowCount,
}: {
  exercise: ExerciseRow;
  logged: LoggedSet[];
  previous: LastSets;
  drafts: Record<number, SetDraft>;
  rowCount: number;
}): ResolvedRow[] {
  const previousWorking = previous.filter((s) => !s.isWarmup);
  const previousWarmups = previous.filter((s) => s.isWarmup);
  const suggestion = suggestNextWeight(previous, exercise.defaultReps);

  let workingSeen = 0;
  let warmupSeen = 0;

  return Array.from({ length: rowCount }, (_, rowIndex) => {
    // A logged set is the source of truth for its own warmup flag; pending rows
    // follow the local draft.
    const set = logged[rowIndex];
    const warmup = set ? set.isWarmup : (drafts[rowIndex]?.isWarmup ?? false);

    let match: { weightKg: number; repsCompleted: number } | undefined;
    if (warmup) {
      warmupSeen += 1;
      match = previousWarmups[warmupSeen - 1];
    } else {
      workingSeen += 1;
      match = previousWorking[workingSeen - 1];
    }

    return {
      rowIndex,
      warmup,
      displayNumber: warmup ? warmupSeen : workingSeen,
      previous: match ?? null,
      fill: match
        ? { weight: match.weightKg, reps: match.repsCompleted }
        : {
            weight: suggestion?.weightKg ?? 0,
            reps: suggestion?.reps ?? exercise.defaultReps,
          },
    };
  });
}
