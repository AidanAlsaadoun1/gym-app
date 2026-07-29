"use client";

import { Check, Trophy } from "lucide-react";

import { NumberInput } from "@/components/ui/number-input";
import { cn } from "@/lib/utils";
import { formatWeight } from "@/lib/ui/format";
import type { LoggedSet, PrKind } from "@/lib/session/types";
import type { ResolvedRow } from "./rows";

export interface SetDraft {
  weight: number | null;
  reps: number | null;
  isWarmup: boolean;
}

/** Shared column template — the header and every row must line up exactly. */
export const SET_GRID =
  "grid grid-cols-[2rem_minmax(3.5rem,1fr)_4.25rem_4.25rem_2.5rem] items-center gap-2";

export function SetRowHeader() {
  return (
    <div className={cn(SET_GRID, "px-3 pb-1")}>
      <HeaderCell>Set</HeaderCell>
      <HeaderCell>Previous</HeaderCell>
      <HeaderCell className="text-center">Kg</HeaderCell>
      <HeaderCell className="text-center">Reps</HeaderCell>
      <span />
    </div>
  );
}

function HeaderCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase tracking-[0.08em] text-fg-subtle",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SetRow({
  row,
  logged,
  draft,
  prKind,
  busy,
  onDraftChange,
  onToggleWarmup,
  onToggleLogged,
  onUsePrevious,
}: {
  row: ResolvedRow;
  logged: LoggedSet | null;
  draft: SetDraft | undefined;
  prKind: PrKind;
  busy: boolean;
  onDraftChange: (patch: Partial<SetDraft>) => void;
  onToggleWarmup: () => void;
  onToggleLogged: () => void;
  onUsePrevious: () => void;
}) {
  const { displayNumber, previous, fill, warmup: isWarmup } = row;
  const done = logged !== null;

  // A logged row reads from the server row; a pending row from the local draft.
  const weightValue = done ? logged.weightKg : (draft?.weight ?? null);
  const repsValue = done ? logged.repsCompleted : (draft?.reps ?? null);

  // The placeholder is exactly what checking an untouched row will log, so the
  // fast path — "same as last time" — needs no typing at all.
  const weightPlaceholder = formatWeight(fill.weight);
  const repsPlaceholder = String(fill.reps);

  return (
    <div
      className={cn(
        SET_GRID,
        "rounded-xl px-3 py-1.5 transition-colors",
        done ? "bg-success-soft/55" : "hover:bg-inset/60",
      )}
    >
      {/* The PR badge hangs off the set number rather than the check button —
          on the right it was clipped by the card's rounded overflow. */}
      <div className="relative">
        <button
          type="button"
          onClick={onToggleWarmup}
          aria-label={
            isWarmup ? "Change to a working set" : "Mark as a warmup set"
          }
          className={cn(
            "tappable flex size-7 items-center justify-center rounded-lg text-[13px] font-bold tabular-nums",
            isWarmup
              ? "bg-warning-soft text-warning"
              : "text-fg-muted hover:bg-inset",
          )}
        >
          {isWarmup ? "W" : displayNumber}
        </button>
        {prKind ? (
          <span
            title={
              prKind === "weight" ? "Heaviest set yet" : "Best set volume yet"
            }
            className="pointer-events-none absolute -right-1 -top-1 flex size-4 animate-pop items-center justify-center rounded-full bg-accent text-accent-fg"
          >
            <Trophy className="size-2.5" />
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onUsePrevious}
        disabled={!previous}
        aria-label={
          previous
            ? `Fill with previous: ${formatWeight(previous.weightKg)} kg by ${previous.repsCompleted} reps`
            : "No previous set"
        }
        className={cn(
          "truncate rounded-lg py-1 text-left text-[13px] tabular-nums",
          previous
            ? "text-fg-muted hover:text-fg active:text-accent"
            : "cursor-default text-fg-subtle",
        )}
      >
        {previous
          ? `${formatWeight(previous.weightKg)} × ${previous.repsCompleted}`
          : "—"}
      </button>

      <NumberInput
        aria-label={`Weight in kg for set ${displayNumber}`}
        value={weightValue}
        placeholder={weightPlaceholder}
        onChange={(value) => onDraftChange({ weight: value })}
        max={1000}
        className={cn("h-9 text-[15px]", done && "bg-transparent")}
      />

      <NumberInput
        aria-label={`Reps for set ${displayNumber}`}
        value={repsValue}
        placeholder={repsPlaceholder}
        onChange={(value) => onDraftChange({ reps: value })}
        max={200}
        integer
        className={cn("h-9 text-[15px]", done && "bg-transparent")}
      />

      <button
        type="button"
        onClick={onToggleLogged}
        disabled={busy}
        aria-pressed={done}
        aria-label={done ? "Undo this set" : "Complete this set"}
        className={cn(
          "tappable flex size-9 items-center justify-center rounded-lg disabled:opacity-50",
          done
            ? "bg-success text-white"
            : "border border-border bg-inset text-fg-subtle hover:border-border-strong hover:text-fg",
        )}
      >
        <Check className={cn("size-4", done && "animate-check")} />
      </button>
    </div>
  );
}
