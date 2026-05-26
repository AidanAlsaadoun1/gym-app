"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  Minus,
  PlayCircle,
  Plus,
  Timer,
  Trash2,
  Trophy,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  clearAutosave,
  loadAutosave,
  useSessionAutosave,
} from "@/lib/session/autosave";
import {
  formatLastSetsLine,
  suggestNextWeight,
} from "@/lib/session/progression";
import { resolveVideoUrl } from "@/lib/exercises/media";

/* -------------------------------------------------------------------------- */
/*                                   types                                     */
/* -------------------------------------------------------------------------- */

export interface ExerciseRow {
  exerciseId: string;
  name: string;
  primaryMuscleGroup: string;
  equipment: string;
  defaultSets: number;
  defaultReps: number;
  supersetGroup: number | null;
  imageUrl: string | null;
  videoUrl: string | null;
}

export interface LoggedSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  weightKg: number;
  repsCompleted: number;
  isWarmup: boolean;
}

export interface LastSet {
  setNumber: number;
  weightKg: number;
  repsCompleted: number;
  isWarmup: boolean;
}

export type LastSets = LastSet[];

interface AutosaveState {
  currentIdx: number;
  pendingWeight: number;
  pendingReps: number;
  isWarmup: boolean;
}

interface LiveSessionProps {
  sessionId: string;
  startTime: string;
  templateName: string | null;
  /** Estimated minutes from the source template (for the timer target). */
  targetMinutes: number | null;
  exercises: ExerciseRow[];
  initialSets: LoggedSet[];
  lastSetsByExercise: Record<string, LastSets>;
}

const REST_DEFAULT_SECONDS = 90;
const REST_ADJUST_SECONDS = 30;

/* -------------------------------------------------------------------------- */

const SUPERSET_LABELS = ["", "A", "B", "C", "D"];

export function LiveSession({
  sessionId,
  startTime,
  templateName,
  targetMinutes,
  exercises,
  initialSets,
  lastSetsByExercise,
}: LiveSessionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [sets, setSets] = useState<LoggedSet[]>(initialSets);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Lazy initial values from the first exercise's suggestion (or its target
  // reps if there's no history) so the input is correct on first paint,
  // before any effect has a chance to update it.
  const [pendingWeight, setPendingWeight] = useState<number>(
    () => computeInitialPending(exercises[0], lastSetsByExercise).weight,
  );
  const [pendingReps, setPendingReps] = useState<number>(
    () => computeInitialPending(exercises[0], lastSetsByExercise).reps,
  );
  const [isWarmup, setIsWarmup] = useState<boolean>(false);
  const [logging, setLogging] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rest timer between sets. Stored as an absolute epoch ms so the
  // displayed countdown matches even if the tick interval drifts.
  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const restFiredRef = useRef(false);

  const currentExercise = exercises[currentIdx] ?? null;

  /* -------------------- restore from autosave / suggest -------------------- */
  const hydratedFromAutosave = useRef(false);

  // Hydrate the inputs from autosave once on mount. If anything was found
  // we set a flag so the per-exercise effect below skips its first run and
  // doesn't clobber the restored values.
  useEffect(() => {
    const restored = loadAutosave<AutosaveState>(sessionId);
    if (restored && restored.data) {
      hydratedFromAutosave.current = true;
      setCurrentIdx(restored.data.currentIdx);
      setPendingWeight(restored.data.pendingWeight);
      setPendingReps(restored.data.pendingReps);
      setIsWarmup(restored.data.isWarmup);
    }
    // Mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the exercise changes, seed the input with the progression
  // suggestion. Skipped on first mount if we just restored autosave.
  useEffect(() => {
    if (hydratedFromAutosave.current) {
      hydratedFromAutosave.current = false;
      return;
    }
    if (!currentExercise) return;
    const last = lastSetsByExercise[currentExercise.exerciseId] ?? [];
    const suggestion = suggestNextWeight(last, currentExercise.defaultReps);
    if (suggestion) {
      setPendingWeight(suggestion.weightKg);
      setPendingReps(suggestion.reps);
    } else {
      setPendingReps(currentExercise.defaultReps);
    }
    setIsWarmup(false);
    // Only react to exercise switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx]);

  /* ------------------------------ autosave -------------------------------- */
  useSessionAutosave<AutosaveState>(sessionId, {
    currentIdx,
    pendingWeight,
    pendingReps,
    isWarmup,
  });

  /* -------------------------------- timer --------------------------------- */
  const elapsed = useElapsedSeconds(startTime);

  /* --------------------------- derived values ----------------------------- */
  const currentSets = useMemo(
    () =>
      currentExercise
        ? sets.filter((s) => s.exerciseId === currentExercise.exerciseId)
        : [],
    [sets, currentExercise],
  );

  const completedExerciseIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sets) {
      if (s.isWarmup) continue;
      counts.set(s.exerciseId, (counts.get(s.exerciseId) ?? 0) + 1);
    }
    const done = new Set<string>();
    for (const ex of exercises) {
      if ((counts.get(ex.exerciseId) ?? 0) >= ex.defaultSets) {
        done.add(ex.exerciseId);
      }
    }
    return done;
  }, [sets, exercises]);

  const nextSetNumber = currentSets.length + 1;
  const isAtTargetSets =
    currentExercise !== null &&
    currentSets.filter((s) => !s.isWarmup).length >=
      currentExercise.defaultSets;

  /* -------------------------------- actions -------------------------------- */

  const logSet = () => {
    if (!currentExercise) return;
    if (pendingWeight < 0 || pendingReps < 0) {
      setError("Weight and reps must be non-negative");
      return;
    }
    setError(null);
    setLogging(true);

    fetch(`/api/sessions/${sessionId}/sets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exerciseId: currentExercise.exerciseId,
        setNumber: nextSetNumber,
        weightKg: pendingWeight,
        repsCompleted: pendingReps,
        isWarmup,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not log set");
        }
        const data = await res.json();
        setSets((prev) => [...prev, data.set]);
        playLogSound();
        // Auto-start the rest timer for working sets only.
        if (!isWarmup) {
          restFiredRef.current = false;
          setRestEndAt(Date.now() + REST_DEFAULT_SECONDS * 1000);
        }
      })
      .catch((err) => setError(err.message ?? "Could not log set"))
      .finally(() => setLogging(false));
  };

  const deleteSet = (id: string) => {
    fetch(`/api/sessions/${sessionId}/sets/${id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("Could not delete set");
        setSets((prev) => prev.filter((s) => s.id !== id));
      })
      .catch(() => setError("Could not delete set"));
  };

  // Frozen snapshot shown on the post-workout overview screen.
  const [complete, setComplete] = useState<{
    durationSeconds: number;
  } | null>(null);

  const finish = () => {
    setFinishing(true);
    fetch(`/api/sessions/${sessionId}/finish`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not finish session");
        }
        clearAutosave(sessionId);
        setRestEndAt(null);
        setConfirmFinish(false);
        // Freeze the elapsed seconds at finish time — the timer hook keeps
        // ticking otherwise, which would feel weird on the overview.
        setComplete({ durationSeconds: elapsed });
      })
      .catch((err) => {
        setError(err.message ?? "Could not finish session");
      })
      .finally(() => setFinishing(false));
  };

  const dismissComplete = () => {
    startTransition(() => {
      router.push("/");
      router.refresh();
    });
  };

  /* --------------------------------- render -------------------------------- */

  if (exercises.length === 0) {
    // Ad-hoc session with no template attached — out of scope for this
    // milestone, but we shouldn't crash.
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Session</h1>
        <p className="text-sm text-neutral-500">
          This session isn&apos;t linked to a template. Ad-hoc sessions land in
          a later milestone.
        </p>
        <Button onClick={finish} disabled={finishing}>
          {finishing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "End session"
          )}
        </Button>
      </div>
    );
  }

  const last = currentExercise
    ? (lastSetsByExercise[currentExercise.exerciseId] ?? [])
    : [];
  const hint = formatLastSetsLine(last);

  const targetSeconds = targetMinutes ? targetMinutes * 60 : null;
  const targetProgress =
    targetSeconds && targetSeconds > 0
      ? Math.min(1, elapsed / targetSeconds)
      : null;
  const overTarget = targetSeconds !== null && elapsed > targetSeconds;

  return (
    <div className="-mx-4 -mt-6 flex min-h-[calc(100dvh-6rem)] flex-col">
      {complete ? (
        <SessionComplete
          durationSeconds={complete.durationSeconds}
          sets={sets}
          exercises={exercises}
          onDismiss={dismissComplete}
          dismissing={isPending}
        />
      ) : null}

      {/* sticky header with timer + finish */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs uppercase tracking-wide text-neutral-500">
              {templateName ?? "Session"}
            </p>
            <p
              className={cn(
                "font-mono text-2xl font-semibold tabular-nums leading-tight",
                overTarget ? "text-amber-600" : "text-neutral-900",
              )}
            >
              {formatElapsed(elapsed)}
              {targetMinutes ? (
                <span className="ml-1 text-sm font-normal text-neutral-400">
                  / {targetMinutes}m
                </span>
              ) : null}
            </p>
          </div>
          {confirmFinish ? (
            <div className="flex items-center gap-1">
              <Button
                variant="destructive"
                size="sm"
                onClick={finish}
                disabled={finishing}
              >
                {finishing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "End"
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmFinish(false)}
                disabled={finishing}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmFinish(true)}
            >
              <Flag className="size-4" />
              Finish
            </Button>
          )}
        </div>

        {targetProgress !== null ? (
          <div
            aria-hidden
            className="mt-2 h-1 w-full overflow-hidden rounded-full bg-neutral-100"
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                overTarget ? "bg-amber-500" : "bg-neutral-900",
              )}
              style={{ width: `${Math.round(targetProgress * 100)}%` }}
            />
          </div>
        ) : null}

        {/* exercise progress dots */}
        <ul className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
          {exercises.map((ex, i) => (
            <li key={ex.exerciseId}>
              <button
                type="button"
                onClick={() => setCurrentIdx(i)}
                aria-label={`Jump to ${ex.name}`}
                className={cn(
                  "size-2.5 rounded-full transition-colors",
                  i === currentIdx
                    ? "bg-neutral-900"
                    : completedExerciseIds.has(ex.exerciseId)
                      ? "bg-emerald-500"
                      : "bg-neutral-300",
                )}
              />
            </li>
          ))}
        </ul>
      </header>

      <main className="flex-1 space-y-4 px-4 py-4">
        <RestTimer
          endAt={restEndAt}
          firedRef={restFiredRef}
          onSkip={() => {
            setRestEndAt(null);
            restFiredRef.current = false;
          }}
          onAdjust={(deltaSec) => {
            setRestEndAt((prev) => {
              if (prev === null) return Date.now() + deltaSec * 1000;
              return Math.max(Date.now() + 1000, prev + deltaSec * 1000);
            });
            if (deltaSec > 0) restFiredRef.current = false;
          }}
          onStart={() => {
            restFiredRef.current = false;
            setRestEndAt(Date.now() + REST_DEFAULT_SECONDS * 1000);
          }}
        />

        {currentExercise ? (
          <>
            <ExerciseCard
              exercise={currentExercise}
              setNumber={nextSetNumber}
              hint={hint}
            />

            <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="grid grid-cols-2 gap-3">
                <NumericStepper
                  label="Weight (kg)"
                  value={pendingWeight}
                  step={2.5}
                  fineStep={1.25}
                  min={0}
                  max={1000}
                  onChange={setPendingWeight}
                />
                <NumericStepper
                  label="Reps"
                  value={pendingReps}
                  step={1}
                  fineStep={1}
                  min={0}
                  max={200}
                  onChange={setPendingReps}
                  integer
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  checked={isWarmup}
                  onChange={(e) => setIsWarmup(e.target.checked)}
                  className="size-4 rounded"
                />
                Warmup set
              </label>

              {error ? (
                <div
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </div>
              ) : null}

              <Button
                onClick={logSet}
                disabled={logging}
                className="w-full"
                size="lg"
              >
                {logging ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Check className="size-4" />
                    Log set {nextSetNumber}
                  </>
                )}
              </Button>
            </div>

            {currentSets.length > 0 ? (
              <SetList sets={currentSets} onDelete={deleteSet} />
            ) : null}

            <ExerciseNav
              currentIdx={currentIdx}
              total={exercises.length}
              isAtTargetSets={isAtTargetSets}
              finishing={finishing}
              onPrev={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              onNext={() =>
                setCurrentIdx((i) => Math.min(exercises.length - 1, i + 1))
              }
              onFinish={finish}
            />
          </>
        ) : null}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  pieces                                     */
/* -------------------------------------------------------------------------- */

function ExerciseCard({
  exercise,
  setNumber,
  hint,
}: {
  exercise: ExerciseRow;
  setNumber: number;
  hint: string | null;
}) {
  const videoHref = resolveVideoUrl(exercise.name, exercise.videoUrl);
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="flex">
        <ExerciseThumb imageUrl={exercise.imageUrl} alt={exercise.name} />
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight">
                {exercise.name}
              </h2>
              <p className="mt-0.5 text-xs uppercase tracking-wide text-neutral-500">
                {exercise.primaryMuscleGroup} · {exercise.equipment}
              </p>
            </div>
            {exercise.supersetGroup ? (
              <span className="rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white">
                Superset{" "}
                {SUPERSET_LABELS[exercise.supersetGroup] ??
                  exercise.supersetGroup}
              </span>
            ) : null}
          </div>

          <a
            href={videoHref}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
          >
            <PlayCircle className="size-3.5" />
            Watch how
          </a>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3 border-t border-neutral-100 px-4 py-2.5 text-sm">
        <span className="text-neutral-500">
          {setNumber > exercise.defaultSets ? (
            <>
              <span className="font-semibold text-emerald-700">Bonus set</span>{" "}
              #{setNumber} · target {exercise.defaultReps} reps
            </>
          ) : (
            <>
              Set{" "}
              <span className="font-semibold text-neutral-900">
                {setNumber}
              </span>{" "}
              of {exercise.defaultSets} · target {exercise.defaultReps} reps
            </>
          )}
        </span>
        {hint ? <span className="text-xs text-neutral-400">{hint}</span> : null}
      </div>
    </section>
  );
}

function ExerciseThumb({
  imageUrl,
  alt,
}: {
  imageUrl: string | null;
  alt: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={alt}
        className="size-20 shrink-0 bg-neutral-100 object-cover"
        loading="lazy"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex size-20 shrink-0 items-center justify-center bg-neutral-100 text-neutral-400"
    >
      {/* Simple dumbbell-ish placeholder */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8v8" />
        <path d="M18 8v8" />
        <path d="M3 12h18" />
        <path d="M2 9v6" />
        <path d="M22 9v6" />
      </svg>
    </div>
  );
}

function NumericStepper({
  label,
  value,
  step,
  fineStep,
  min,
  max,
  onChange,
  integer = false,
}: {
  label: string;
  value: number;
  step: number;
  fineStep: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  integer?: boolean;
}) {
  const setClamped = (v: number) => {
    const next = Math.min(max, Math.max(min, integer ? Math.round(v) : v));
    onChange(next);
  };

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-neutral-700">
        {label}
      </span>
      <div className="flex items-stretch gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Decrease ${label}`}
          onClick={() => setClamped(value - step)}
          className="size-11 shrink-0"
        >
          <Minus className="size-4" />
        </Button>
        <Input
          type="number"
          inputMode={integer ? "numeric" : "decimal"}
          step={fineStep}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) setClamped(n);
          }}
          onFocus={(e) => e.target.select()}
          className="h-11 text-center text-lg font-semibold tabular-nums"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Increase ${label}`}
          onClick={() => setClamped(value + step)}
          className="size-11 shrink-0"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function SetList({
  sets,
  onDelete,
}: {
  sets: LoggedSet[];
  onDelete: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white">
      <h3 className="border-b border-neutral-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        This exercise ({sets.length})
      </h3>
      <ul className="divide-y divide-neutral-100">
        {sets.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
          >
            <span className="tabular-nums">
              <span className="font-semibold">#{s.setNumber}</span>{" "}
              <span className="text-neutral-600">
                {s.weightKg}kg × {s.repsCompleted}
              </span>
              {s.isWarmup ? (
                <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                  warmup
                </span>
              ) : null}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Delete set ${s.setNumber}`}
              onClick={() => onDelete(s.id)}
              className="size-8"
            >
              <Trash2 className="size-4 text-neutral-500" />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExerciseNav({
  currentIdx,
  total,
  isAtTargetSets,
  finishing,
  onPrev,
  onNext,
  onFinish,
}: {
  currentIdx: number;
  total: number;
  isAtTargetSets: boolean;
  finishing: boolean;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
}) {
  const isLast = currentIdx === total - 1;
  return (
    <div className="flex items-center justify-between gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={onPrev}
        disabled={currentIdx === 0}
        className="flex-1"
      >
        <ChevronLeft className="size-4" />
        Prev
      </Button>
      {isLast ? (
        <Button
          type="button"
          variant="success"
          onClick={onFinish}
          disabled={finishing}
          className="flex-1"
        >
          <Flag className="size-4" />
          Finish
        </Button>
      ) : (
        <Button
          type="button"
          variant={isAtTargetSets ? "default" : "outline"}
          onClick={onNext}
          className="flex-1"
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      )}
    </div>
  );
}

function RestTimer({
  endAt,
  firedRef,
  onSkip,
  onAdjust,
  onStart,
}: {
  endAt: number | null;
  firedRef: React.MutableRefObject<boolean>;
  onSkip: () => void;
  onAdjust: (deltaSeconds: number) => void;
  onStart: () => void;
}) {
  // Tick frequently so the seconds display stays smooth.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endAt]);

  // Vibrate / play indicator once when the timer expires.
  useEffect(() => {
    if (endAt === null) return;
    if (firedRef.current) return;
    if (Date.now() >= endAt) {
      firedRef.current = true;
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        // vibrate may throw in some browsers — ignore.
      }
    }
  }, [endAt, now, firedRef]);

  if (endAt === null) {
    return (
      <button
        type="button"
        onClick={onStart}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50"
      >
        <Timer className="size-4" />
        Start a rest timer
      </button>
    );
  }

  const remainingMs = endAt - now;
  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const expired = remainingMs <= 0;

  return (
    <section
      role="timer"
      aria-live="polite"
      className={cn(
        "rounded-2xl border p-3 transition-colors",
        expired
          ? "border-emerald-300 bg-emerald-50"
          : "border-sky-200 bg-sky-50",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Timer
            className={cn(
              "size-5",
              expired ? "text-emerald-600" : "text-sky-600",
            )}
          />
          <div>
            <p
              className={cn(
                "font-mono text-2xl font-semibold tabular-nums leading-none",
                expired ? "text-emerald-700" : "text-sky-700",
              )}
            >
              {formatRest(remainingSec)}
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              {expired ? "Rested — go" : "Rest"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAdjust(-REST_ADJUST_SECONDS)}
            disabled={remainingSec <= REST_ADJUST_SECONDS}
          >
            -{REST_ADJUST_SECONDS}s
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onAdjust(REST_ADJUST_SECONDS)}
          >
            +{REST_ADJUST_SECONDS}s
          </Button>
          <Button
            type="button"
            variant={expired ? "default" : "ghost"}
            size="sm"
            onClick={onSkip}
          >
            {expired ? "Done" : "Skip"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function formatRest(seconds: number): string {
  if (seconds < 60) return `0:${seconds.toString().padStart(2, "0")}`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/*                                  helpers                                    */
/* -------------------------------------------------------------------------- */

function useElapsedSeconds(startIso: string) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(startIso).getTime()) / 1000)),
  );
  useEffect(() => {
    const start = new Date(startIso).getTime();
    const update = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [startIso]);
  return elapsed;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Initial weight + reps for the input on first paint. Uses the progression
 * suggestion against the user's previous-session sets when available, falls
 * back to the exercise's target reps and 0 weight otherwise. SSR-safe — it's
 * pure and doesn't touch window.
 */
function computeInitialPending(
  ex: ExerciseRow | undefined,
  lastSetsByExercise: Record<string, LastSets>,
): { weight: number; reps: number } {
  if (!ex) return { weight: 0, reps: 0 };
  const last = lastSetsByExercise[ex.exerciseId] ?? [];
  const suggestion = suggestNextWeight(last, ex.defaultReps);
  return {
    weight: suggestion?.weightKg ?? 0,
    reps: suggestion?.reps ?? ex.defaultReps,
  };
}

/**
 * Per-muscle-group color used both on the SessionComplete overview and on
 * a couple of other ambient surfaces. Tailwind classes only — these need
 * to be statically present in the source so the JIT compiler keeps them.
 */
const MUSCLE_TONES: Record<string, { bg: string; text: string }> = {
  chest: { bg: "bg-rose-100", text: "text-rose-700" },
  back: { bg: "bg-sky-100", text: "text-sky-700" },
  shoulders: { bg: "bg-amber-100", text: "text-amber-800" },
  biceps: { bg: "bg-violet-100", text: "text-violet-700" },
  triceps: { bg: "bg-fuchsia-100", text: "text-fuchsia-700" },
  quads: { bg: "bg-emerald-100", text: "text-emerald-700" },
  hamstrings: { bg: "bg-teal-100", text: "text-teal-700" },
  glutes: { bg: "bg-orange-100", text: "text-orange-700" },
  calves: { bg: "bg-lime-100", text: "text-lime-700" },
  core: { bg: "bg-indigo-100", text: "text-indigo-700" },
  forearms: { bg: "bg-cyan-100", text: "text-cyan-700" },
};
const MUSCLE_TONE_DEFAULT = { bg: "bg-neutral-100", text: "text-neutral-700" };

function muscleTone(group: string) {
  return MUSCLE_TONES[group] ?? MUSCLE_TONE_DEFAULT;
}

interface SessionSummary {
  tonnage: number;
  workingSets: number;
  exerciseCount: number;
  muscles: { group: string; sets: number }[];
}

function summarizeSession(
  sets: LoggedSet[],
  exercises: ExerciseRow[],
): SessionSummary {
  const byExerciseId = new Map(exercises.map((ex) => [ex.exerciseId, ex]));
  const muscleSets = new Map<string, number>();
  const seenExercises = new Set<string>();

  let tonnage = 0;
  let workingSets = 0;
  for (const s of sets) {
    if (s.isWarmup) continue;
    workingSets += 1;
    tonnage += s.weightKg * s.repsCompleted;
    seenExercises.add(s.exerciseId);
    const ex = byExerciseId.get(s.exerciseId);
    if (ex) {
      const mg = ex.primaryMuscleGroup;
      muscleSets.set(mg, (muscleSets.get(mg) ?? 0) + 1);
    }
  }

  const muscles = Array.from(muscleSets.entries())
    .map(([group, sets]) => ({ group, sets }))
    .sort((a, b) => b.sets - a.sets);

  return {
    tonnage,
    workingSets,
    exerciseCount: seenExercises.size,
    muscles,
  };
}

function SessionComplete({
  durationSeconds,
  sets,
  exercises,
  onDismiss,
  dismissing,
}: {
  durationSeconds: number;
  sets: LoggedSet[];
  exercises: ExerciseRow[];
  onDismiss: () => void;
  dismissing: boolean;
}) {
  const summary = useMemo(
    () => summarizeSession(sets, exercises),
    [sets, exercises],
  );

  // Play the celebratory chord once on mount.
  useEffect(() => {
    playFinishSound();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-complete-heading"
      className="fixed inset-0 z-30 flex items-end justify-center bg-neutral-900/60 px-3 pb-3 pt-6 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 px-5 py-6 text-white">
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-white/90 transition-colors hover:bg-white/20"
            disabled={dismissing}
          >
            <X className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="size-5" />
            <p className="text-xs font-semibold uppercase tracking-wide opacity-90">
              Workout complete
            </p>
          </div>
          <h2
            id="session-complete-heading"
            className="mt-2 font-mono text-4xl font-semibold tabular-nums"
          >
            {formatElapsed(durationSeconds)}
          </h2>
          <p className="mt-1 text-sm opacity-90">
            Nice work — locked in and logged.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-3 gap-2">
            <SummaryStat
              label="Tonnage"
              value={formatTonnageKg(summary.tonnage)}
            />
            <SummaryStat
              label="Working sets"
              value={String(summary.workingSets)}
            />
            <SummaryStat
              label="Exercises"
              value={String(summary.exerciseCount)}
            />
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Muscles worked
          </h3>
          {summary.muscles.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-500">
              No working sets — only warmups logged.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {summary.muscles.map(({ group, sets }) => {
                const tone = muscleTone(group);
                const maxSets = summary.muscles[0]?.sets ?? 1;
                const widthPct = Math.max(
                  8,
                  Math.round((sets / maxSets) * 100),
                );
                return (
                  <li
                    key={group}
                    className="flex items-center justify-between gap-3 rounded-lg border border-neutral-100 px-3 py-2"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          tone.bg,
                          tone.text,
                        )}
                      >
                        {group}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className={cn("h-full rounded-full", tone.bg)}
                          style={{
                            width: `${widthPct}%`,
                            filter: "saturate(2)",
                          }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-neutral-700">
                      {sets}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-neutral-200 bg-white p-4">
          <Button
            onClick={onDismiss}
            disabled={dismissing}
            className="w-full"
            size="lg"
          >
            {dismissing ? <Loader2 className="size-4 animate-spin" /> : "Done"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-neutral-900">
        {value}
      </p>
    </div>
  );
}

function formatTonnageKg(kg: number): string {
  if (kg === 0) return "0";
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)} kg`;
}

/**
 * Triumphant ascending arpeggio (C4-E4-G4-C5) played when a session is
 * finished. Triangle wave for a softer, bell-ish timbre.
 */
function playFinishSound() {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + i * 0.12;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.14, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.6);
    });
    setTimeout(() => ctx.close().catch(() => undefined), 1500);
  } catch {
    // ignore
  }
}

/**
 * Short Web Audio beep when a set is logged. Best-effort — wrapped in
 * try/catch so missing/blocked audio context never breaks the flow.
 */
function playLogSound() {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1320, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
    // Let the context close itself once the sound's done — avoids leaking
    // hardware audio resources on mobile Safari.
    setTimeout(() => ctx.close().catch(() => undefined), 400);
  } catch {
    // ignore — silent fallback
  }
}
