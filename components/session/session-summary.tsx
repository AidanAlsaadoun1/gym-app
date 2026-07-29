"use client";

import { useEffect, useMemo } from "react";
import { Loader2, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { SectionLabel } from "@/components/ui/label";
import { Stat } from "@/components/ui/stat";
import { playWorkoutComplete } from "@/lib/session/feedback";
import { formatClock, formatTonnage, splitTonnage } from "@/lib/ui/format";
import { muscleHue, toneFill, toneStyle } from "@/lib/ui/tones";
import type { ExerciseRow, LoggedSet, PrKind } from "@/lib/session/types";

export function SessionSummary({
  open,
  durationSeconds,
  sets,
  exercises,
  prBySetId,
  onDismiss,
  dismissing,
}: {
  open: boolean;
  durationSeconds: number;
  sets: LoggedSet[];
  exercises: ExerciseRow[];
  prBySetId: Record<string, PrKind>;
  onDismiss: () => void;
  dismissing: boolean;
}) {
  const summary = useMemo(
    () => summarize(sets, exercises, prBySetId),
    [sets, exercises, prBySetId],
  );

  useEffect(() => {
    if (open) playWorkoutComplete();
  }, [open]);

  const volume = splitTonnage(summary.tonnage);

  return (
    <Sheet
      open={open}
      onClose={onDismiss}
      title="Workout complete"
      footer={
        <Button
          onClick={onDismiss}
          disabled={dismissing}
          size="lg"
          className="w-full"
          data-autofocus
        >
          {dismissing ? <Loader2 className="size-4 animate-spin" /> : "Done"}
        </Button>
      }
    >
      <div className="bg-accent-soft px-5 py-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-fg">
          <Trophy className="size-6" />
        </div>
        <p className="mt-3 font-mono text-[40px] font-bold leading-none tabular-nums text-fg">
          {formatClock(durationSeconds)}
        </p>
        <p className="mt-2 text-[13px] font-medium text-fg-muted">
          {summary.prCount > 0
            ? `${summary.prCount} personal best${summary.prCount === 1 ? "" : "s"} — that's a good day.`
            : "Logged and in the books."}
        </p>
      </div>

      <div className="space-y-5 p-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Volume" value={volume.value} unit={volume.unit} />
          <Stat label="Sets" value={String(summary.workingSets)} />
          <Stat
            label="PRs"
            value={String(summary.prCount)}
            tone={summary.prCount > 0 ? "accent" : "default"}
          />
        </div>

        {summary.muscles.length > 0 ? (
          <section>
            <SectionLabel>Muscles worked</SectionLabel>
            <ul className="mt-2 space-y-1.5">
              {summary.muscles.map((muscle) => {
                const hue = muscleHue(muscle.group);
                const width = Math.max(
                  8,
                  Math.round((muscle.sets / summary.muscles[0]!.sets) * 100),
                );
                return (
                  <li key={muscle.group} className="flex items-center gap-2.5">
                    <span
                      style={toneStyle(hue)}
                      className="w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px] font-bold uppercase tracking-[0.06em] capitalize"
                    >
                      {muscle.group}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-inset">
                      <div
                        className="h-full rounded-full"
                        style={{ ...toneFill(hue), width: `${width}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-[13px] font-bold tabular-nums text-fg-muted">
                      {muscle.sets}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <p className="text-[13px] text-fg-muted">
            No working sets logged — only warmups.
          </p>
        )}

        {summary.exercises.length > 0 ? (
          <section>
            <SectionLabel>Exercises</SectionLabel>
            <ul className="mt-2 divide-y divide-border rounded-card border border-border">
              {summary.exercises.map((exercise) => (
                <li
                  key={exercise.exerciseId}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-[14px] font-semibold text-fg">
                      {exercise.name}
                    </p>
                    {exercise.prCount > 0 ? (
                      <Trophy className="size-3.5 shrink-0 text-accent" />
                    ) : null}
                  </div>
                  <p className="shrink-0 text-[12px] font-medium tabular-nums text-fg-muted">
                    {exercise.sets} {exercise.sets === 1 ? "set" : "sets"} ·{" "}
                    {formatTonnage(exercise.tonnage)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Sheet>
  );
}

interface SummaryShape {
  tonnage: number;
  workingSets: number;
  prCount: number;
  muscles: { group: string; sets: number }[];
  exercises: {
    exerciseId: string;
    name: string;
    sets: number;
    tonnage: number;
    prCount: number;
  }[];
}

function summarize(
  sets: LoggedSet[],
  exercises: ExerciseRow[],
  prBySetId: Record<string, PrKind>,
): SummaryShape {
  const byId = new Map(exercises.map((ex) => [ex.exerciseId, ex]));
  const muscleSets = new Map<string, number>();
  const perExercise = new Map<string, SummaryShape["exercises"][number]>();

  let tonnage = 0;
  let workingSets = 0;
  let prCount = 0;

  for (const set of sets) {
    if (prBySetId[set.id]) prCount += 1;
    if (set.isWarmup) continue;

    const volume = set.weightKg * set.repsCompleted;
    tonnage += volume;
    workingSets += 1;

    const exercise = byId.get(set.exerciseId);
    if (!exercise) continue;

    muscleSets.set(
      exercise.primaryMuscleGroup,
      (muscleSets.get(exercise.primaryMuscleGroup) ?? 0) + 1,
    );

    const entry = perExercise.get(set.exerciseId) ?? {
      exerciseId: set.exerciseId,
      name: exercise.name,
      sets: 0,
      tonnage: 0,
      prCount: 0,
    };
    entry.sets += 1;
    entry.tonnage += volume;
    if (prBySetId[set.id]) entry.prCount += 1;
    perExercise.set(set.exerciseId, entry);
  }

  return {
    tonnage,
    workingSets,
    prCount,
    muscles: Array.from(muscleSets, ([group, count]) => ({
      group,
      sets: count,
    })).sort((a, b) => b.sets - a.sets),
    // Keep the template's exercise order rather than log order.
    exercises: exercises
      .map((ex) => perExercise.get(ex.exerciseId))
      .filter((entry): entry is SummaryShape["exercises"][number] =>
        Boolean(entry),
      ),
  };
}
