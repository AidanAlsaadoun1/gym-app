import Link from "next/link";
import { ChevronRight, Clock, Layers } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { StartWorkoutButton } from "@/components/start-workout-button";
import { splitHue, toneStyle } from "@/lib/ui/tones";
import type { SplitType } from "@/lib/db/schema";

export interface RoutineSummary {
  id: string;
  name: string;
  splitType: SplitType;
  estimatedMinutes: number;
  exerciseCount: number;
  /** First few exercise names, for the card preview. */
  exerciseNames?: string[];
}

/**
 * A routine at a glance. `compact` drops the exercise preview for the home
 * screen's quick-start list; the full version is what the routines tab shows.
 */
export function RoutineCard({
  routine,
  compact = false,
  actions,
}: {
  routine: RoutineSummary;
  compact?: boolean;
  actions?: React.ReactNode;
}) {
  const hue = splitHue(routine.splitType);
  const preview = routine.exerciseNames ?? [];
  const overflow = routine.exerciseCount - preview.length;

  return (
    <div className="rounded-card border border-border bg-card shadow-card">
      <div className="flex items-start gap-2 p-3.5 pb-2.5">
        <Link
          href={`/templates/${routine.id}`}
          className="tappable min-w-0 flex-1"
        >
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[16px] font-bold text-fg">
              {routine.name}
            </h3>
            <ChevronRight className="size-4 shrink-0 text-fg-subtle" />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge style={toneStyle(hue)}>{routine.splitType}</Badge>
            <span className="flex items-center gap-1 text-[12px] font-medium text-fg-muted">
              <Layers className="size-3.5" />
              {routine.exerciseCount}{" "}
              {routine.exerciseCount === 1 ? "exercise" : "exercises"}
            </span>
            <span className="flex items-center gap-1 text-[12px] font-medium text-fg-muted">
              <Clock className="size-3.5" />~{routine.estimatedMinutes} min
            </span>
          </div>
        </Link>
        {actions}
      </div>

      {!compact && preview.length > 0 ? (
        <ul className="space-y-1 px-3.5 pb-1">
          {preview.map((name) => (
            <li key={name} className="truncate text-[13px] text-fg-muted">
              {name}
            </li>
          ))}
          {overflow > 0 ? (
            <li className="text-[13px] font-medium text-fg-subtle">
              +{overflow} more
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="p-3.5 pt-2.5">
        <StartWorkoutButton
          templateId={routine.id}
          fullWidth
          label="Start workout"
        />
      </div>
    </div>
  );
}
