"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { muscleHue, toneColor } from "@/lib/ui/tones";

export interface PickerExercise {
  id: string;
  name: string;
  primaryMuscleGroup: string;
  equipment: string;
}

const MUSCLE_GROUPS = [
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
] as const;

/**
 * Full-screen exercise library.
 *
 * Multi-select: building a routine means adding five or six exercises, and
 * re-opening the sheet for each one was the slowest part of the old flow.
 */
export function ExercisePicker({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (exercises: PickerExercise[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [exercises, setExercises] = useState<PickerExercise[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setMuscleFilter(null);
    setSelected([]);
  }, [open]);

  // The seeded library doesn't change at runtime, so one fetch per mount is
  // enough — cached for the lifetime of the component.
  useEffect(() => {
    if (!open || exercises !== null) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/exercises")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setExercises(data.exercises ?? []);
      })
      .catch(() => {
        if (!cancelled) setExercises([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, exercises]);

  const filtered = useMemo(() => {
    if (!exercises) return [];
    const needle = query.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (muscleFilter && exercise.primaryMuscleGroup !== muscleFilter) {
        return false;
      }
      if (needle && !exercise.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [exercises, query, muscleFilter]);

  const confirm = () => {
    if (!exercises || selected.length === 0) return;
    const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
    // Preserve tap order — that's the order they land in the routine.
    onAdd(
      selected
        .map((id) => byId.get(id))
        .filter((exercise): exercise is PickerExercise => Boolean(exercise)),
    );
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant="full"
      title="Add exercises"
      footer={
        <Button
          className="w-full"
          size="lg"
          onClick={confirm}
          disabled={selected.length === 0}
        >
          {selected.length === 0
            ? "Select exercises"
            : `Add ${selected.length} ${selected.length === 1 ? "exercise" : "exercises"}`}
        </Button>
      }
    >
      <div className="space-y-3 border-b border-border p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search exercises…"
            className="pl-9"
            data-autofocus
          />
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          <Chip
            active={muscleFilter === null}
            onClick={() => setMuscleFilter(null)}
          >
            All
          </Chip>
          {MUSCLE_GROUPS.map((muscle) => (
            <Chip
              key={muscle}
              active={muscleFilter === muscle}
              onClick={() =>
                setMuscleFilter(muscleFilter === muscle ? null : muscle)
              }
            >
              {muscle}
            </Chip>
          ))}
        </div>
      </div>

      {loading && exercises === null ? (
        <div className="flex justify-center py-16 text-fg-subtle">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-4 py-16 text-center text-[13px] text-fg-muted">
          Nothing matches that.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((exercise) => {
            const isSelected = selected.includes(exercise.id);
            return (
              <li key={exercise.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() =>
                    setSelected((prev) =>
                      prev.includes(exercise.id)
                        ? prev.filter((id) => id !== exercise.id)
                        : [...prev, exercise.id],
                    )
                  }
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    isSelected ? "bg-accent-soft" : "hover:bg-card",
                  )}
                >
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: toneColor(
                        muscleHue(exercise.primaryMuscleGroup),
                      ),
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-fg">
                      {exercise.name}
                    </span>
                    <span className="block truncate text-[12px] capitalize text-fg-subtle">
                      {exercise.primaryMuscleGroup} · {exercise.equipment}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border",
                      isSelected
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-border",
                    )}
                  >
                    {isSelected ? <Check className="size-3.5" /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
