"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Search, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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

export function ExercisePicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (exercise: PickerExercise) => void;
}) {
  const [query, setQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [exercises, setExercises] = useState<PickerExercise[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Fetch the library on first open. We cache for the lifetime of this
  // component since the seed list doesn't change at runtime.
  useEffect(() => {
    if (!open || exercises !== null) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/exercises")
      .then((r) => r.json())
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
    const q = query.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (muscleFilter && ex.primaryMuscleGroup !== muscleFilter) return false;
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exercises, query, muscleFilter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <h2 className="text-base font-semibold">Add exercise</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="size-5" />
        </Button>
      </header>

      <div className="space-y-3 border-b border-neutral-200 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises…"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <FilterChip
            active={muscleFilter === null}
            onClick={() => setMuscleFilter(null)}
          >
            All
          </FilterChip>
          {MUSCLE_GROUPS.map((m) => (
            <FilterChip
              key={m}
              active={muscleFilter === m}
              onClick={() => setMuscleFilter(muscleFilter === m ? null : m)}
            >
              {m}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && exercises === null ? (
          <div className="flex h-full items-center justify-center text-neutral-400">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-500">
            No exercises match.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {filtered.map((ex) => (
              <li key={ex.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(ex);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-50 active:bg-neutral-100"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ex.name}</p>
                    <p className="text-xs text-neutral-500">
                      {ex.primaryMuscleGroup} · {ex.equipment}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
        active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
      )}
    >
      {children}
    </button>
  );
}
