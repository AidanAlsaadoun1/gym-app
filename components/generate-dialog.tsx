"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";

import { Badge, Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/label";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/number-input";
import { useToast } from "@/components/ui/toast";
import { muscleHue, toneStyle } from "@/lib/ui/tones";

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
const PREVIEW_DEBOUNCE_MS = 250;

/**
 * Trims a routine to fit the time you actually have, then starts it as a
 * one-off session without touching the saved routine.
 */
export function GenerateDialog({
  templateId,
  templateName,
  defaultMinutes,
  open,
  onClose,
}: {
  templateId: string;
  templateName?: string;
  defaultMinutes: number;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [target, setTarget] = useState(defaultMinutes);
  const [data, setData] = useState<GenerateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const debounce = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setTarget(defaultMinutes);
    setData(null);
  }, [open, defaultMinutes]);

  const fetchPreview = useCallback(
    async (minutes: number) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/workout-templates/${templateId}/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetMinutes: minutes }),
          },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? "Could not build a plan");
        setData(json as GenerateResponse);
      } catch (error) {
        toast((error as Error).message, "error");
      } finally {
        setLoading(false);
      }
    },
    [templateId, toast],
  );

  useEffect(() => {
    if (!open) return;
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(
      () => void fetchPreview(target),
      PREVIEW_DEBOUNCE_MS,
    );
    return () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    };
  }, [target, open, fetchPreview]);

  const start = async () => {
    if (!data) return;
    setStarting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutTemplateId: templateId,
          plan: data.plan.map((item) => ({
            exerciseId: item.exerciseId,
            defaultSets: item.plannedSets,
            defaultReps: item.defaultReps,
            exerciseOrder: item.exerciseOrder,
            supersetGroup: item.supersetGroup,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 409) {
        toast(
          "A workout's already in progress — resume or discard it first.",
          "error",
        );
        setStarting(false);
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Could not start this workout");

      router.push(`/session/${json.session.id}`);
    } catch (error) {
      toast((error as Error).message, "error");
      setStarting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={templateName ? `Fit "${templateName}" to time` : "Fit to time"}
      footer={
        <Button
          onClick={start}
          disabled={!data || starting || data.plan.length === 0}
          size="lg"
          className="w-full"
        >
          {starting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Play className="size-4 fill-current" />
              Start {data ? `${data.estimatedMinutes} min` : ""} workout
            </>
          )}
        </Button>
      }
    >
      <div className="space-y-4 border-b border-border p-4">
        <Stepper
          label="Time available"
          value={target}
          onChange={setTarget}
          step={5}
          min={10}
          max={240}
          integer
          suffix="min"
        />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
          {PRESETS.map((minutes) => (
            <Chip
              key={minutes}
              active={target === minutes}
              onClick={() => setTarget(minutes)}
            >
              {minutes} min
            </Chip>
          ))}
        </div>
      </div>

      <div className="p-4">
        {loading && !data ? (
          <div className="flex justify-center py-10 text-fg-subtle">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            <p className="text-[13px] text-fg-muted">
              <span className="font-bold text-fg">
                {data.plan.length}{" "}
                {data.plan.length === 1 ? "exercise" : "exercises"}
              </span>{" "}
              · ~{data.estimatedMinutes} min ·{" "}
              {data.changed ? "trimmed to fit" : "matches the routine"}
            </p>

            <ul className="divide-y divide-border rounded-card border border-border">
              {data.plan.map((item) => (
                <li
                  key={item.exerciseId}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-fg">
                      {item.name}
                    </p>
                    <Badge
                      style={toneStyle(muscleHue(item.primaryMuscleGroup))}
                      className="mt-1 capitalize"
                    >
                      {item.primaryMuscleGroup}
                    </Badge>
                  </div>
                  <p className="shrink-0 text-[13px] font-bold tabular-nums text-fg">
                    {item.plannedSets} × {item.defaultReps}
                    {item.plannedSets !== item.defaultSets ? (
                      <span className="ml-1.5 text-[12px] font-medium text-fg-subtle line-through">
                        {item.defaultSets}
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>

            {data.dropped.length > 0 ? (
              <section>
                <SectionLabel>Dropped ({data.dropped.length})</SectionLabel>
                <ul className="mt-2 space-y-1.5">
                  {data.dropped.map((item) => (
                    <li
                      key={item.exerciseId}
                      className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border px-3 py-2 text-[13px] text-fg-subtle"
                    >
                      <span className="truncate line-through">{item.name}</span>
                      <span className="shrink-0 tabular-nums">
                        {item.defaultSets} × {item.defaultReps}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : (
          <p className="py-10 text-center text-[13px] text-fg-subtle">
            Set the time you have and we&apos;ll shape the session around it.
          </p>
        )}
      </div>
    </Sheet>
  );
}

/** Standalone trigger — used on the routine edit screen. */
export function GenerateButton({
  templateId,
  templateName,
  defaultMinutes,
}: {
  templateId: string;
  templateName?: string;
  defaultMinutes: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Fit to time
      </Button>
      <GenerateDialog
        templateId={templateId}
        templateName={templateName}
        defaultMinutes={defaultMinutes}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
