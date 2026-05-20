"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExercisePicker, type PickerExercise } from "@/components/exercise-picker";
import { cn } from "@/lib/utils";

type SplitType =
  | "push"
  | "pull"
  | "legs"
  | "upper"
  | "lower"
  | "full"
  | "custom";

const SPLIT_TYPES: SplitType[] = [
  "push",
  "pull",
  "legs",
  "upper",
  "lower",
  "full",
  "custom",
];

export interface TemplateFormExercise {
  exerciseId: string;
  name: string;
  primaryMuscleGroup: string;
  equipment: string;
  defaultSets: number;
  defaultReps: number;
  supersetGroup: number | null;
}

export interface TemplateFormInitialValues {
  id?: string;
  name: string;
  splitType: SplitType;
  estimatedMinutes: number;
  exercises: TemplateFormExercise[];
}

const SUPERSET_LABELS = ["—", "A", "B", "C", "D"]; // null, 1, 2, 3, 4

function nextSupersetGroup(current: number | null): number | null {
  // Cycle through null -> 1 -> 2 -> 3 -> 4 -> null.
  if (current === null) return 1;
  if (current >= 4) return null;
  return current + 1;
}

function supersetLabel(group: number | null): string {
  if (group === null) return SUPERSET_LABELS[0];
  return SUPERSET_LABELS[group] ?? String(group);
}

export function TemplateForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial: TemplateFormInitialValues;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);

  const [name, setName] = useState(initial.name);
  const [splitType, setSplitType] = useState<SplitType>(initial.splitType);
  const [estimatedMinutes, setEstimatedMinutes] = useState(initial.estimatedMinutes);
  // Internal rows have a stable rowId so dnd-kit can keep React keys steady
  // across reorders.
  type RowItem = TemplateFormExercise & { rowId: string };
  const idPrefix = useId();
  const rowSeq = useRef(0);
  const makeRowId = () => `${idPrefix}-r${++rowSeq.current}`;
  const [exercises, setExercises] = useState<RowItem[]>(() =>
    initial.exercises.map((ex) => ({ ...ex, rowId: makeRowId() })),
  );
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const addExercise = (ex: PickerExercise) => {
    setExercises((prev) => [
      ...prev,
      {
        rowId: makeRowId(),
        exerciseId: ex.id,
        name: ex.name,
        primaryMuscleGroup: ex.primaryMuscleGroup,
        equipment: ex.equipment,
        defaultSets: 3,
        defaultReps: 10,
        supersetGroup: null,
      },
    ]);
  };

  const removeRow = (rowId: string) =>
    setExercises((prev) => prev.filter((r) => r.rowId !== rowId));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setExercises((prev) => {
      const oldIndex = prev.findIndex((r) => r.rowId === active.id);
      const newIndex = prev.findIndex((r) => r.rowId === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const updateField = <K extends keyof TemplateFormExercise>(
    rowId: string,
    key: K,
    value: TemplateFormExercise[K],
  ) => {
    setExercises((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [key]: value } : r)),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    const payload = {
      name: name.trim(),
      splitType,
      estimatedMinutes,
      exercises: exercises.map((ex, idx) => ({
        exerciseId: ex.exerciseId,
        defaultSets: ex.defaultSets,
        defaultReps: ex.defaultReps,
        exerciseOrder: idx,
        supersetGroup: ex.supersetGroup,
      })),
    };

    startTransition(async () => {
      const url =
        mode === "create"
          ? "/api/workout-templates"
          : `/api/workout-templates/${initial.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save template");
        return;
      }

      router.push("/templates");
      router.refresh();
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Push A"
            required
            maxLength={80}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="splitType">Split</Label>
            <select
              id="splitType"
              value={splitType}
              onChange={(e) => setSplitType(e.target.value as SplitType)}
              className="flex h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-base capitalize shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            >
              {SPLIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="estimatedMinutes">Est. minutes</Label>
            <Input
              id="estimatedMinutes"
              type="number"
              min={10}
              max={240}
              step={5}
              value={estimatedMinutes}
              onChange={(e) =>
                setEstimatedMinutes(Math.max(10, Number(e.target.value) || 60))
              }
            />
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Exercises ({exercises.length})
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>

        {exercises.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
            Tap “Add” to start choosing exercises.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={exercises.map((r) => r.rowId)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {exercises.map((ex) => (
                  <SortableExerciseRow
                    key={ex.rowId}
                    row={ex}
                    onRemove={() => removeRow(ex.rowId)}
                    onUpdate={(key, value) => updateField(ex.rowId, key, value)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      <div className="sticky bottom-20 -mx-4 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === "create" ? (
              "Create"
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addExercise}
      />
    </form>
  );
}

function SortableExerciseRow({
  row,
  onRemove,
  onUpdate,
}: {
  row: TemplateFormExercise & { rowId: string };
  onRemove: () => void;
  onUpdate: <K extends keyof TemplateFormExercise>(
    key: K,
    value: TemplateFormExercise[K],
  ) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.rowId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-2xl border border-neutral-200 bg-white p-3 touch-none",
        isDragging && "z-10 shadow-lg ring-1 ring-indigo-300",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
          className="-ml-1 -mt-1 flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 active:cursor-grabbing"
        >
          <GripVertical className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <p className="text-xs text-neutral-500">
            {row.primaryMuscleGroup} · {row.equipment}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Remove"
          onClick={onRemove}
          className="size-8"
        >
          <Trash2 className="size-4 text-neutral-500" />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <NumberField
          label="Sets"
          value={row.defaultSets}
          min={1}
          max={20}
          onChange={(v) => onUpdate("defaultSets", v)}
        />
        <NumberField
          label="Reps"
          value={row.defaultReps}
          min={1}
          max={100}
          onChange={(v) => onUpdate("defaultReps", v)}
        />
        <div className="space-y-1">
          <span className="block text-xs font-medium text-neutral-700">
            Superset
          </span>
          <button
            type="button"
            onClick={() =>
              onUpdate("supersetGroup", nextSupersetGroup(row.supersetGroup))
            }
            className={cn(
              "flex h-9 w-full items-center justify-center rounded-lg border text-sm font-semibold tabular-nums",
              row.supersetGroup === null
                ? "border-neutral-200 bg-white text-neutral-400"
                : "border-indigo-600 bg-indigo-600 text-white",
            )}
          >
            {supersetLabel(row.supersetGroup)}
          </button>
        </div>
      </div>
    </li>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="block text-xs font-medium text-neutral-700">{label}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        onFocus={(e) => e.target.select()}
        className="h-9"
      />
    </div>
  );
}
