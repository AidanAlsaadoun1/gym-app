"use client";

import { CheckCircle2, Dumbbell, Minus, Plus, PlayCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Menu } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import { muscleHue, toneColor, toneStyle } from "@/lib/ui/tones";
import { resolveVideoUrl } from "@/lib/exercises/media";
import type { ExerciseRow, LoggedSet, PrKind } from "@/lib/session/types";
import type { ResolvedRow } from "./rows";
import { SetRow, SetRowHeader, type SetDraft } from "./set-row";

const SUPERSET_LABELS = ["", "A", "B", "C", "D"];

export function ExerciseBlock({
  exercise,
  rows,
  logged,
  drafts,
  prBySetId,
  busyRows,
  onDraftChange,
  onToggleWarmup,
  onToggleLogged,
  onUsePrevious,
  onAddSet,
  onRemoveSet,
}: {
  exercise: ExerciseRow;
  rows: ResolvedRow[];
  /** Logged sets for this exercise, oldest first. */
  logged: LoggedSet[];
  drafts: Record<number, SetDraft>;
  prBySetId: Record<string, PrKind>;
  busyRows: number[];
  onDraftChange: (rowIndex: number, patch: Partial<SetDraft>) => void;
  onToggleWarmup: (rowIndex: number) => void;
  onToggleLogged: (rowIndex: number) => void;
  onUsePrevious: (rowIndex: number) => void;
  onAddSet: () => void;
  onRemoveSet: () => void;
}) {
  const hue = muscleHue(exercise.primaryMuscleGroup);
  const videoHref = resolveVideoUrl(exercise.name, exercise.videoUrl);

  const completedWorking = logged.filter((s) => !s.isWarmup).length;
  const complete = completedWorking >= exercise.defaultSets;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-card border border-border bg-card shadow-card",
        // Supersets get a coloured spine so back-to-back exercises read as a
        // group at a glance.
        exercise.supersetGroup && "border-l-[3px]",
      )}
      style={
        exercise.supersetGroup
          ? { borderLeftColor: toneColor(hue) }
          : undefined
      }
    >
      <header className="flex items-start gap-3 p-3">
        <ExerciseThumb
          imageUrl={exercise.imageUrl}
          alt={exercise.name}
          hue={hue}
        />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold leading-tight text-fg">
            {exercise.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge style={toneStyle(hue)} className="capitalize">
              {exercise.primaryMuscleGroup}
            </Badge>
            <span className="text-[11px] font-medium capitalize text-fg-subtle">
              {exercise.equipment}
            </span>
            {exercise.supersetGroup ? (
              <Badge tone="solid">
                Superset{" "}
                {SUPERSET_LABELS[exercise.supersetGroup] ??
                  exercise.supersetGroup}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {complete ? (
            <CheckCircle2
              className="size-5 text-success"
              aria-label="All planned sets done"
            />
          ) : (
            <span
              className="text-[12px] font-semibold tabular-nums text-fg-subtle"
              aria-label={`${completedWorking} of ${exercise.defaultSets} sets done`}
            >
              {completedWorking}/{exercise.defaultSets}
            </span>
          )}
          <Menu
            label={`Options for ${exercise.name}`}
            items={[
              {
                label: "Watch how",
                icon: PlayCircle,
                href: videoHref,
                external: true,
              },
              { label: "Add set", icon: Plus, onSelect: onAddSet },
              {
                label: "Remove last set",
                icon: Minus,
                onSelect: onRemoveSet,
                disabled: rows.length <= 1,
                tone: "danger",
              },
            ]}
          />
        </div>
      </header>

      <div className="px-1 pb-1">
        <SetRowHeader />
        <div className="space-y-0.5">
          {rows.map((row) => {
            const set = logged[row.rowIndex] ?? null;
            return (
              <SetRow
                key={row.rowIndex}
                row={row}
                logged={set}
                draft={drafts[row.rowIndex]}
                prKind={set ? (prBySetId[set.id] ?? null) : null}
                busy={busyRows.includes(row.rowIndex)}
                onDraftChange={(patch) => onDraftChange(row.rowIndex, patch)}
                onToggleWarmup={() => onToggleWarmup(row.rowIndex)}
                onToggleLogged={() => onToggleLogged(row.rowIndex)}
                onUsePrevious={() => onUsePrevious(row.rowIndex)}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={onAddSet}
          className="tappable mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-semibold text-fg-muted hover:bg-inset hover:text-fg"
        >
          <Plus className="size-4" />
          Add set
        </button>
      </div>
    </section>
  );
}

function ExerciseThumb({
  imageUrl,
  alt,
  hue,
}: {
  imageUrl: string | null;
  alt: string;
  hue: number;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={alt}
        loading="lazy"
        className="size-11 shrink-0 rounded-xl bg-inset object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex size-11 shrink-0 items-center justify-center rounded-xl"
      style={toneStyle(hue)}
    >
      <Dumbbell className="size-5" />
    </div>
  );
}
