"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Dumbbell,
  Flag,
  Loader2,
  Timer,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Menu } from "@/components/ui/menu";
import { ProgressBar } from "@/components/ui/progress";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { clearAutosave, loadAutosave, useSessionAutosave } from "@/lib/session/autosave";
import {
  playPersonalBest,
  playRestOver,
  playSetLogged,
} from "@/lib/session/feedback";
import type {
  ExerciseBest,
  ExerciseRow,
  LastSets,
  LoggedSet,
  PrKind,
} from "@/lib/session/types";
import { formatClock, splitTonnage } from "@/lib/ui/format";
import { ExerciseBlock } from "./exercise-block";
import { RestTimerBar } from "./rest-timer-bar";
import { resolveRows, type ResolvedRow } from "./rows";
import { SessionSummary } from "./session-summary";
import type { SetDraft } from "./set-row";

const REST_DEFAULT_SECONDS = 90;
/** A restored rest timer older than this is stale — don't resurrect it. */
const REST_RESTORE_GRACE_MS = 10 * 60 * 1000;
const EDIT_DEBOUNCE_MS = 500;

interface LiveSessionProps {
  sessionId: string;
  startTime: string;
  templateName: string | null;
  /** Estimated minutes from the source template, for the pace bar. */
  targetMinutes: number | null;
  exercises: ExerciseRow[];
  initialSets: LoggedSet[];
  lastSetsByExercise: Record<string, LastSets>;
  /** Historical bests per exercise, excluding this session. */
  bests: Record<string, ExerciseBest>;
}

/** Drafts are keyed by exercise + row so they survive a reload. */
type DraftMap = Record<string, SetDraft>;

interface AutosaveState {
  drafts: DraftMap;
  plannedRows: Record<string, number>;
  restEndAt: number | null;
  restSeconds: number;
}

const rowKey = (exerciseId: string, rowIndex: number) =>
  `${exerciseId}#${rowIndex}`;

export function LiveSession({
  sessionId,
  startTime,
  templateName,
  targetMinutes,
  exercises,
  initialSets,
  lastSetsByExercise,
  bests,
}: LiveSessionProps) {
  const router = useRouter();
  const toast = useToast();
  const [isNavigating, startTransition] = useTransition();

  const [sets, setSets] = useState<LoggedSet[]>(initialSets);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [plannedRows, setPlannedRows] = useState<Record<string, number>>(() =>
    Object.fromEntries(exercises.map((ex) => [ex.exerciseId, ex.defaultSets])),
  );
  const [busyRows, setBusyRows] = useState<string[]>([]);

  const [restEndAt, setRestEndAt] = useState<number | null>(null);
  const [restSeconds, setRestSeconds] = useState(REST_DEFAULT_SECONDS);

  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  /**
   * Elapsed seconds at the moment Finish succeeded. Non-null means the workout
   * is over: the clock stops and the summary shows this frozen value rather
   * than a number that keeps climbing behind the sheet.
   */
  const [frozenDuration, setFrozenDuration] = useState<number | null>(null);

  const elapsed = useElapsedSeconds(startTime, frozenDuration === null);

  /* ------------------------------ restore ------------------------------- */
  useEffect(() => {
    const restored = loadAutosave<AutosaveState>(sessionId);
    if (!restored) return;
    const { drafts: savedDrafts, plannedRows: savedRows, restEndAt: savedRest, restSeconds: savedSeconds } =
      restored.data;

    if (savedDrafts) setDrafts(savedDrafts);
    if (savedRows) {
      // Merge rather than replace: an exercise added to the template since the
      // snapshot still needs its default row count.
      setPlannedRows((current) => ({ ...current, ...savedRows }));
    }
    if (savedSeconds) setRestSeconds(savedSeconds);
    if (
      savedRest &&
      savedRest > Date.now() &&
      savedRest - Date.now() < REST_RESTORE_GRACE_MS
    ) {
      setRestEndAt(savedRest);
    }
    // Mount-only: this is a one-shot hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSessionAutosave<AutosaveState>(sessionId, {
    drafts,
    plannedRows,
    restEndAt,
    restSeconds,
  });

  /* ---------------------------- derived state --------------------------- */

  const logsByExercise = useMemo(() => {
    const map = new Map<string, LoggedSet[]>();
    for (const set of sets) {
      const list = map.get(set.exerciseId);
      if (list) list.push(set);
      else map.set(set.exerciseId, [set]);
    }
    return map;
  }, [sets]);

  /**
   * Authoritative copy of the log, updated synchronously by `commitSets`.
   *
   * Every mutation reads and writes this ref rather than closing over `sets`,
   * because two checks tapped in quick succession both resolve before React
   * re-renders: whichever landed second would otherwise rebuild the array from
   * a snapshot that predates the first, silently dropping a logged set.
   */
  const setsRef = useRef(sets);

  const commitSets = useCallback((next: LoggedSet[]) => {
    setsRef.current = next;
    setSets(next);
  }, []);

  const draftsByExercise = useMemo(() => {
    const map = new Map<string, Record<number, SetDraft>>();
    for (const [key, draft] of Object.entries(drafts)) {
      const hash = key.lastIndexOf("#");
      if (hash < 0) continue;
      const exerciseId = key.slice(0, hash);
      const rowIndex = Number(key.slice(hash + 1));
      if (!Number.isInteger(rowIndex)) continue;
      const existing = map.get(exerciseId) ?? {};
      existing[rowIndex] = draft;
      map.set(exerciseId, existing);
    }
    return map;
  }, [drafts]);

  const rowsByExercise = useMemo(() => {
    const map = new Map<string, ResolvedRow[]>();
    for (const exercise of exercises) {
      const logged = logsByExercise.get(exercise.exerciseId) ?? [];
      const rowCount = Math.max(
        plannedRows[exercise.exerciseId] ?? exercise.defaultSets,
        logged.length,
        1,
      );
      map.set(
        exercise.exerciseId,
        resolveRows({
          exercise,
          logged,
          previous: lastSetsByExercise[exercise.exerciseId] ?? [],
          drafts: draftsByExercise.get(exercise.exerciseId) ?? {},
          rowCount,
        }),
      );
    }
    return map;
  }, [
    draftsByExercise,
    exercises,
    lastSetsByExercise,
    logsByExercise,
    plannedRows,
  ]);

  const prBySetId = useMemo(() => computePrs(sets, bests), [sets, bests]);

  const totals = useMemo(() => {
    let tonnage = 0;
    let workingSets = 0;
    for (const set of sets) {
      if (set.isWarmup) continue;
      tonnage += set.weightKg * set.repsCompleted;
      workingSets += 1;
    }
    return { tonnage, workingSets };
  }, [sets]);

  const plannedWorkingSets = useMemo(
    () => exercises.reduce((acc, ex) => acc + ex.defaultSets, 0),
    [exercises],
  );

  const rowCountFor = useCallback(
    (exercise: ExerciseRow) =>
      rowsByExercise.get(exercise.exerciseId)?.length ?? 1,
    [rowsByExercise],
  );

  /* ------------------------------- editing ------------------------------ */

  // Pre-edit values, so a failed PATCH can put the row back where it was.
  const preEditRef = useRef(new Map<string, LoggedSet>());
  /** Row keys with a log/unlog request in flight. */
  const inFlightRef = useRef(new Set<string>());
  const editTimers = useRef(new Map<string, number>());

  useEffect(
    () => () => {
      for (const timer of editTimers.current.values()) {
        window.clearTimeout(timer);
      }
    },
    [],
  );

  const patchSet = useCallback(
    (set: LoggedSet, patch: Partial<LoggedSet>, immediate = false) => {
      if (!preEditRef.current.has(set.id)) {
        preEditRef.current.set(set.id, set);
      }
      commitSets(
        setsRef.current.map((s) => (s.id === set.id ? { ...s, ...patch } : s)),
      );

      const send = () => {
        editTimers.current.delete(set.id);
        const body: Record<string, unknown> = {};
        if (patch.weightKg !== undefined) body.weightKg = patch.weightKg;
        if (patch.repsCompleted !== undefined)
          body.repsCompleted = patch.repsCompleted;
        if (patch.isWarmup !== undefined) body.isWarmup = patch.isWarmup;
        if (Object.keys(body).length === 0) return;

        fetch(`/api/sessions/${sessionId}/sets/${set.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
          .then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error ?? "Could not save that change");
            }
            preEditRef.current.delete(set.id);
          })
          .catch((error: Error) => {
            // Put the row back rather than leaving the screen disagreeing with
            // the database about what was logged.
            const original = preEditRef.current.get(set.id);
            if (original) {
              commitSets(
                setsRef.current.map((s) => (s.id === set.id ? original : s)),
              );
              preEditRef.current.delete(set.id);
            }
            toast(error.message, "error");
          });
      };

      const existingTimer = editTimers.current.get(set.id);
      if (existingTimer) window.clearTimeout(existingTimer);
      if (immediate) send();
      else editTimers.current.set(set.id, window.setTimeout(send, EDIT_DEBOUNCE_MS));
    },
    [commitSets, sessionId, toast],
  );

  /* ------------------------------- logging ------------------------------ */

  const startRest = useCallback(() => {
    setRestEndAt(Date.now() + restSeconds * 1000);
  }, [restSeconds]);

  const toggleLogged = useCallback(
    (exercise: ExerciseRow, rowIndex: number) => {
      const key = rowKey(exercise.exerciseId, rowIndex);
      // Guard on a ref, not on `busyRows`: state doesn't update until the next
      // render, so a double-tap on the check would pass the same test twice and
      // log the set twice.
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);

      const logs = logsByExercise.get(exercise.exerciseId) ?? [];
      const existing = logs[rowIndex];

      setBusyRows((prev) => [...prev, key]);
      const release = () => {
        inFlightRef.current.delete(key);
        setBusyRows((prev) => prev.filter((entry) => entry !== key));
      };

      if (existing) {
        fetch(`/api/sessions/${sessionId}/sets/${existing.id}`, {
          method: "DELETE",
        })
          .then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error ?? "Could not remove that set");
            }
            commitSets(setsRef.current.filter((s) => s.id !== existing.id));
            // Keep the numbers on screen when un-checking the last row, so the
            // user can correct a typo and check it again.
            if (rowIndex === logs.length - 1) {
              setDrafts((prev) => ({
                ...prev,
                [key]: {
                  weight: existing.weightKg,
                  reps: existing.repsCompleted,
                  isWarmup: existing.isWarmup,
                },
              }));
            }
          })
          .catch((error: Error) => toast(error.message, "error"))
          .finally(release);
        return;
      }

      const row = rowsByExercise.get(exercise.exerciseId)?.[rowIndex];
      const draft = drafts[key];
      const isWarmup = draft?.isWarmup ?? false;
      // An untouched row logs its placeholder — the numbers already on screen.
      const weightKg = draft?.weight ?? row?.fill.weight ?? 0;
      const repsCompleted = draft?.reps ?? row?.fill.reps ?? exercise.defaultReps;

      fetch(`/api/sessions/${sessionId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: exercise.exerciseId,
          weightKg,
          repsCompleted,
          isWarmup,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? "Could not log that set");
          }
          const { set } = (await res.json()) as { set: LoggedSet };
          const next = [...setsRef.current, set];
          commitSets(next);
          setDrafts((prev) => {
            const remaining = { ...prev };
            delete remaining[key];
            return remaining;
          });
          // PR status is recomputed from the whole log, so it stays right after
          // edits and deletes rather than only on the happy path.
          if (computePrs(next, bests)[set.id]) playPersonalBest();
          else playSetLogged();
          if (!isWarmup) startRest();
        })
        .catch((error: Error) => toast(error.message, "error"))
        .finally(release);
    },
    [
      bests,
      commitSets,
      drafts,
      logsByExercise,
      rowsByExercise,
      sessionId,
      startRest,
      toast,
    ],
  );

  const changeDraft = useCallback(
    (exercise: ExerciseRow, rowIndex: number, patch: Partial<SetDraft>) => {
      const logs = logsByExercise.get(exercise.exerciseId) ?? [];
      const existing = logs[rowIndex];

      if (existing) {
        const setPatch: Partial<LoggedSet> = {};
        if (patch.weight !== undefined && patch.weight !== null) {
          setPatch.weightKg = patch.weight;
        }
        if (patch.reps !== undefined && patch.reps !== null) {
          setPatch.repsCompleted = patch.reps;
        }
        if (patch.isWarmup !== undefined) setPatch.isWarmup = patch.isWarmup;
        if (Object.keys(setPatch).length > 0) patchSet(existing, setPatch);
        return;
      }

      const key = rowKey(exercise.exerciseId, rowIndex);
      setDrafts((prev) => ({
        ...prev,
        [key]: {
          weight: prev[key]?.weight ?? null,
          reps: prev[key]?.reps ?? null,
          isWarmup: prev[key]?.isWarmup ?? false,
          ...patch,
        },
      }));
    },
    [logsByExercise, patchSet],
  );

  const toggleWarmup = useCallback(
    (exercise: ExerciseRow, rowIndex: number) => {
      const logs = logsByExercise.get(exercise.exerciseId) ?? [];
      const existing = logs[rowIndex];
      if (existing) {
        patchSet(existing, { isWarmup: !existing.isWarmup }, true);
        return;
      }
      const key = rowKey(exercise.exerciseId, rowIndex);
      changeDraft(exercise, rowIndex, {
        isWarmup: !(drafts[key]?.isWarmup ?? false),
      });
    },
    [changeDraft, drafts, logsByExercise, patchSet],
  );

  const fillFromPrevious = useCallback(
    (exercise: ExerciseRow, rowIndex: number) => {
      const row = rowsByExercise.get(exercise.exerciseId)?.[rowIndex];
      if (!row) return;
      changeDraft(exercise, rowIndex, {
        weight: row.fill.weight,
        reps: row.fill.reps,
      });
    },
    [changeDraft, rowsByExercise],
  );

  const addSet = useCallback(
    (exercise: ExerciseRow) => {
      const loggedCount = logsByExercise.get(exercise.exerciseId)?.length ?? 0;
      // Derived inside the updater so two quick taps add two rows rather than
      // both computing the same "current + 1".
      setPlannedRows((prev) => {
        const current = Math.max(
          prev[exercise.exerciseId] ?? exercise.defaultSets,
          loggedCount,
          1,
        );
        return { ...prev, [exercise.exerciseId]: current + 1 };
      });
    },
    [logsByExercise],
  );

  const removeSet = useCallback(
    (exercise: ExerciseRow) => {
      const rowCount = rowCountFor(exercise);
      if (rowCount <= 1) return;
      const lastIndex = rowCount - 1;
      const logs = logsByExercise.get(exercise.exerciseId) ?? [];
      const logged = logs[lastIndex];

      if (logged) {
        fetch(`/api/sessions/${sessionId}/sets/${logged.id}`, {
          method: "DELETE",
        })
          .then(async (res) => {
            if (!res.ok) throw new Error("Could not remove that set");
            commitSets(setsRef.current.filter((s) => s.id !== logged.id));
          })
          .catch((error: Error) => toast(error.message, "error"));
      }

      setDrafts((prev) => {
        const next = { ...prev };
        delete next[rowKey(exercise.exerciseId, lastIndex)];
        return next;
      });
      setPlannedRows((prev) => ({
        ...prev,
        [exercise.exerciseId]: rowCount - 1,
      }));
    },
    [commitSets, logsByExercise, rowCountFor, sessionId, toast],
  );

  /* ------------------------------ finishing ----------------------------- */

  const finish = useCallback(() => {
    setFinishing(true);
    fetch(`/api/sessions/${sessionId}/finish`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not finish this workout");
        }
        clearAutosave(sessionId);
        setRestEndAt(null);
        setConfirmFinish(false);
        setFrozenDuration(elapsed);
      })
      .catch((error: Error) => toast(error.message, "error"))
      .finally(() => setFinishing(false));
  }, [elapsed, sessionId, toast]);

  const discard = useCallback(() => {
    setDiscarding(true);
    fetch(`/api/sessions/${sessionId}`, { method: "DELETE" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not discard this workout");
        }
        clearAutosave(sessionId);
        startTransition(() => {
          router.push("/");
          router.refresh();
        });
      })
      .catch((error: Error) => {
        toast(error.message, "error");
        setDiscarding(false);
      });
  }, [router, sessionId, toast]);

  const leaveToHome = useCallback(() => {
    startTransition(() => {
      router.push("/");
      router.refresh();
    });
  }, [router]);

  /* -------------------------------- render ------------------------------ */

  if (exercises.length === 0) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-8">
        <EmptyState
          icon={Dumbbell}
          title="Nothing planned for this session"
          description="This workout isn't linked to a template, so there are no exercises to log. Finish it to clear it out."
          action={
            <Button onClick={finish} disabled={finishing}>
              {finishing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "End session"
              )}
            </Button>
          }
        />
      </div>
    );
  }

  const volume = splitTonnage(totals.tonnage);
  const pace =
    targetMinutes && targetMinutes > 0 ? elapsed / (targetMinutes * 60) : null;
  const overTarget = pace !== null && pace > 1;

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto w-full max-w-xl px-2 py-2">
          <div className="flex items-center gap-1">
            <Link
              href="/"
              aria-label="Back to home"
              className="tappable flex size-9 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-card hover:text-fg"
            >
              <ChevronLeft className="size-5" />
            </Link>

            <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-fg">
              {templateName ?? "Workout"}
            </p>

            <Button size="sm" onClick={() => setConfirmFinish(true)}>
              <Flag className="size-3.5" />
              Finish
            </Button>

            <Menu
              label="Workout options"
              items={[
                {
                  label: restEndAt ? "Restart rest timer" : "Start rest timer",
                  icon: Timer,
                  onSelect: startRest,
                },
                {
                  label: "Discard workout",
                  icon: Trash2,
                  tone: "danger",
                  onSelect: () => setConfirmDiscard(true),
                },
              ]}
            />
          </div>

          <div className="mt-1 flex items-end gap-4 px-2 pb-1">
            <HeaderMetric
              label="Duration"
              value={formatClock(elapsed)}
              mono
              tone={overTarget ? "warning" : "default"}
            />
            <HeaderMetric label="Volume" value={volume.value} unit={volume.unit} />
            <HeaderMetric
              label="Sets"
              value={String(totals.workingSets)}
              unit={`/ ${plannedWorkingSets}`}
            />
          </div>

          {pace !== null ? (
            <ProgressBar
              value={pace}
              tone={overTarget ? "warning" : "accent"}
              className="h-1 rounded-none"
            />
          ) : null}
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-xl flex-1 space-y-3 px-4 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8rem)" }}
      >
        {exercises.map((exercise) => (
          <ExerciseBlock
            key={exercise.exerciseId}
            exercise={exercise}
            rows={rowsByExercise.get(exercise.exerciseId) ?? []}
            logged={logsByExercise.get(exercise.exerciseId) ?? []}
            drafts={draftsByExercise.get(exercise.exerciseId) ?? {}}
            prBySetId={prBySetId}
            busyRows={busyRowsForExercise(busyRows, exercise.exerciseId)}
            onDraftChange={(rowIndex, patch) =>
              changeDraft(exercise, rowIndex, patch)
            }
            onToggleWarmup={(rowIndex) => toggleWarmup(exercise, rowIndex)}
            onToggleLogged={(rowIndex) => toggleLogged(exercise, rowIndex)}
            onUsePrevious={(rowIndex) => fillFromPrevious(exercise, rowIndex)}
            onAddSet={() => addSet(exercise)}
            onRemoveSet={() => removeSet(exercise)}
          />
        ))}

        <Button
          size="lg"
          className="w-full"
          onClick={() => setConfirmFinish(true)}
        >
          <Flag className="size-4" />
          Finish workout
        </Button>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 [&>*]:pointer-events-auto">
        {restEndAt !== null ? (
          <RestTimerBar
            endAt={restEndAt}
            totalSeconds={restSeconds}
            onExpire={playRestOver}
            onSkip={() => setRestEndAt(null)}
            onAdjust={(delta) => {
              setRestSeconds((prev) => Math.max(15, prev + delta));
              setRestEndAt((prev) =>
                prev === null
                  ? null
                  : Math.max(Date.now() + 1000, prev + delta * 1000),
              );
            }}
          />
        ) : null}
        <div
          aria-hidden
          className="bg-bg/95"
          style={{ height: "env(safe-area-inset-bottom)" }}
        />
      </div>

      <Sheet
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        title="Finish workout?"
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setConfirmFinish(false)}
              disabled={finishing}
            >
              Keep going
            </Button>
            <Button
              className="flex-1"
              onClick={finish}
              disabled={finishing}
              data-autofocus
            >
              {finishing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Finish"
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-2 p-4 text-[14px] text-fg-muted">
          <p>
            <span className="font-bold text-fg">
              {totals.workingSets} of {plannedWorkingSets}
            </span>{" "}
            planned sets logged, {formatClock(elapsed)} elapsed.
          </p>
          {totals.workingSets < plannedWorkingSets ? (
            <p>
              The rest will be left unlogged — you can&apos;t add sets to a
              finished workout.
            </p>
          ) : (
            <p>Everything&apos;s logged. Nice session.</p>
          )}
        </div>
      </Sheet>

      <Sheet
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard workout?"
        footer={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setConfirmDiscard(false)}
              disabled={discarding}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={discard}
              disabled={discarding}
            >
              {discarding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Discard"
              )}
            </Button>
          </div>
        }
      >
        <p className="p-4 text-[14px] text-fg-muted">
          This deletes the workout and every set logged in it. There&apos;s no
          undo.
        </p>
      </Sheet>

      <SessionSummary
        open={frozenDuration !== null}
        durationSeconds={frozenDuration ?? elapsed}
        sets={sets}
        exercises={exercises}
        prBySetId={prBySetId}
        onDismiss={leaveToHome}
        dismissing={isNavigating}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function HeaderMetric({
  label,
  value,
  unit,
  mono,
  tone = "default",
}: {
  label: string;
  value: string;
  unit?: string;
  mono?: boolean;
  tone?: "default" | "warning";
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-fg-subtle">
        {label}
      </p>
      <p
        className={cn(
          "text-[19px] font-bold leading-tight tabular-nums",
          mono && "font-mono",
          tone === "warning" ? "text-warning" : "text-fg",
        )}
      >
        {value}
        {unit ? (
          <span className="ml-0.5 text-[12px] font-semibold text-fg-subtle">
            {unit}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function busyRowsForExercise(busyRows: string[], exerciseId: string): number[] {
  const prefix = `${exerciseId}#`;
  return busyRows
    .filter((key) => key.startsWith(prefix))
    .map((key) => Number(key.slice(prefix.length)));
}

/**
 * Which logged sets are personal bests.
 *
 * Derived from the full log rather than tracked as state, so deleting or
 * editing a set can't leave a stale trophy behind. `historyBests` covers every
 * finished session except this one; sets earlier in this workout raise the bar
 * for the ones after them.
 */
function computePrs(
  sets: LoggedSet[],
  historyBests: Record<string, ExerciseBest>,
): Record<string, PrKind> {
  const running = new Map<string, { weight: number; volume: number }>();
  const out: Record<string, PrKind> = {};

  for (const set of sets) {
    if (set.isWarmup || set.repsCompleted <= 0 || set.weightKg <= 0) continue;

    const best =
      running.get(set.exerciseId) ??
      {
        weight: historyBests[set.exerciseId]?.bestWeightKg ?? 0,
        volume: historyBests[set.exerciseId]?.bestSetVolume ?? 0,
      };

    const volume = set.weightKg * set.repsCompleted;
    if (set.weightKg > best.weight) out[set.id] = "weight";
    else if (volume > best.volume) out[set.id] = "volume";

    running.set(set.exerciseId, {
      weight: Math.max(best.weight, set.weightKg),
      volume: Math.max(best.volume, volume),
    });
  }

  return out;
}

/** Ticking elapsed seconds. Stops once the workout is finished. */
function useElapsedSeconds(startIso: string, running: boolean) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(startIso).getTime()) / 1000)),
  );

  useEffect(() => {
    if (!running) return;
    const start = new Date(startIso).getTime();
    const update = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [startIso, running]);

  return elapsed;
}
