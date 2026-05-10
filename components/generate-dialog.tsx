"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PlanItem {
  exerciseId: string;
  defaultSets: number;
  defaultReps: number;
  exerciseOrder: number;
  supersetGroup: number | null;
  plannedSets: number;
  name: string;
  primaryMuscleGroup: string;
  equipment: string;
}

interface DroppedItem {
  exerciseId: string;
  name: string;
  primaryMuscleGroup: string;
  equipment: string;
  defaultSets: number;
  defaultReps: number;
}

interface GenerateResponse {
  plan: PlanItem[];
  dropped: DroppedItem[];
  estimatedMinutes: number;
  changed: boolean;
  targetMinutes: number;
}

const PRESETS = [30, 45, 60, 75];

export function GenerateDialog({
  templateId,
  defaultMinutes,
  open,
  onClose,
}: {
  templateId: string;
  defaultMinutes: number;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<number>(defaultMinutes);
  const [data, setData] = useState<GenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<number | null>(null);

  // Reset when (re)opened.
  useEffect(() => {
    if (open) {
      setTarget(defaultMinutes);
      setData(null);
      setError(null);
    }
  }, [open, defaultMinutes]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Debounced preview fetch on target change.
  useEffect(() => {
    if (!open) return;
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => {
      fetchPreview(target);
    }, 250);
    return () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, open]);

  const fetchPreview = async (minutes: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workout-templates/${templateId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetMinutes: minutes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Could not generate plan");
      }
      const json = (await res.json()) as GenerateResponse;
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const start = async () => {
    if (!data) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutTemplateId: templateId,
          plan: data.plan.map((p) => ({
            exerciseId: p.exerciseId,
            defaultSets: p.plannedSets,
            defaultReps: p.defaultReps,
            exerciseOrder: p.exerciseOrder,
            supersetGroup: p.supersetGroup,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Could not start session");
      }
      const json = await res.json();
      router.push(`/session/${json.session.id}`);
    } catch (err) {
      setError((err as Error).message);
      setStarting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <h2 className="text-base font-semibold">Generate workout</h2>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
          <X className="size-5" />
        </Button>
      </header>

      <div className="space-y-4 border-b border-neutral-200 px-4 py-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-neutral-700">
            Target session length (minutes)
          </label>
          <Input
            type="number"
            min={10}
            max={240}
            step={5}
            value={target}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) setTarget(Math.min(240, Math.max(10, v)));
            }}
            className="text-lg font-semibold tabular-nums"
          />
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setTarget(m)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
                target === m
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
              )}
            >
              {m} min
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading && !data ? (
          <div className="flex h-full items-center justify-center text-neutral-400">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              ~<span className="font-semibold tabular-nums">{data.estimatedMinutes}</span>{" "}
              min ·{" "}
              <span className="font-semibold tabular-nums">{data.plan.length}</span>{" "}
              exercise{data.plan.length === 1 ? "" : "s"}
              {data.changed ? " · trimmed" : " · matches template"}
            </p>

            <ul className="space-y-2">
              {data.plan.map((p) => (
                <li
                  key={p.exerciseId}
                  className="rounded-xl border border-neutral-200 bg-white p-3"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        {p.primaryMuscleGroup} · {p.equipment}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm tabular-nums">
                      <span className="font-semibold">{p.plannedSets}</span> ×{" "}
                      {p.defaultReps}
                      {p.plannedSets !== p.defaultSets ? (
                        <span className="ml-1 text-xs text-neutral-400 line-through">
                          {p.defaultSets}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {data.dropped.length > 0 ? (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Dropped ({data.dropped.length})
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {data.dropped.map((d) => (
                    <li
                      key={d.exerciseId}
                      className="flex items-baseline justify-between rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500"
                    >
                      <span className="truncate">{d.name}</span>
                      <span className="shrink-0 text-xs">
                        {d.defaultSets} × {d.defaultReps}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Adjust the target to preview.</p>
        )}

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}
      </div>

      <footer className="border-t border-neutral-200 bg-white p-4">
        <Button
          onClick={start}
          disabled={!data || starting || data.plan.length === 0}
          className="w-full"
          size="lg"
        >
          {starting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Play className="size-4" />
              Start workout
            </>
          )}
        </Button>
      </footer>
    </div>
  );
}

/** Wrapper button — opens the dialog in its own state. */
export function GenerateButton({
  templateId,
  defaultMinutes,
  size = "sm",
  variant = "outline",
  className,
}: {
  templateId: string;
  defaultMinutes: number;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        Generate
      </Button>
      <GenerateDialog
        templateId={templateId}
        defaultMinutes={defaultMinutes}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
