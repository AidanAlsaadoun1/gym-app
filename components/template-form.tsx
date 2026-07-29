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

import { Badge, Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label, SectionLabel } from "@/components/ui/label";
import { NumberInput, Stepper } from "@/components/ui/number-input";
import { useToast } from "@/components/ui/toast";
import {
  ExercisePicker,
  type PickerExercise,
} from "@/components/exercise-picker";
import { cn } from "@/lib/utils";
import { muscleHue, toneStyle } from "@/lib/ui/tones";

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

const SUPERSET_LABELS = ["—", "A", "B", "C", "D"];

function nextSupersetGroup(current: number | null): number | null {
  // Cycle null -> 1 -> 2 -> 3 -> 4 -> null.
  if (current === null) return 1;
  if (current >= 4) return null;
  return current + 1;
}

function supersetLabel(group: number | null): string {
  if (group === null) return SUPERSET_LABELS[0]!;
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
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);

  const [name, setName] = useState(initial.name);
  const [splitType, setSplitType] = useState<SplitType>(initial.splitType);
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    initial.estimatedMinutes,
  );

  // Rows carry a stable rowId so dnd-kit keeps React keys steady across
  // reorders, and so the same exercise can appear twice.
  type RowItem = TemplateFormExercise & { rowId: string };
  const idPrefix = useId();
  const rowSeq = useRef(0);
  const makeRowId = () => `${idPrefix}-r${++rowSeq.current}`;
  const [exercises, setExercises] = useState<RowItem[]>(() =>
    initial.exercises.map((exercise) => ({ ...exercise, rowId: makeRowId() })),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const addExercises = (picked: PickerExercise[]) => {
    setExercises((prev) => [
      ...prev,
      ...picked.map((exercise) => ({
        rowId: makeRowId(),
        exerciseId: exercise.id,
        name: exercise.name,
        primaryMuscleGroup: exercise.primaryMuscleGroup,
        equipment: exercise.equipment,
        defaultSets: 3,
        defaultReps: 10,
        supersetGroup: null,
      })),
    ]);
  };

  const removeRow = (rowId: string) =>
    setExercises((prev) => prev.filter((row) => row.rowId !== rowId));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setExercises((prev) => {
      const oldIndex = prev.findIndex((row) => row.rowId === active.id);
      const newIndex = prev.findIndex((row) => row.rowId === over.id);
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
      prev.map((row) => (row.rowId === rowId ? { ...row, [key]: value } : row)),
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      toast("Give the routine a name", "error");
      return;
    }

    const payload = {
      name: name.trim(),
      splitType,
      estimatedMinutes,
      exercises: exercises.map((exercise, index) => ({
        exerciseId: exercise.exerciseId,
        defaultSets: exercise.defaultSets,
        defaultReps: exercise.defaultReps,
        exerciseOrder: index,
        supersetGroup: exercise.supersetGroup,
      })),
    };

    startTransition(async () => {
      const url =
        mode === "create"
          ? "/api/workout-templates"
          : `/api/workout-templates/${initial.id}`;

      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "Could not save this routine", "error");
        return;
      }

      toast(
        mode === "create" ? `Created "${payload.name}"` : "Routine saved",
        "success",
      );
      router.push("/templates");
      router.refresh();
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Card className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Push A"
            required
            maxLength={80}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Split</Label>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
            {SPLIT_TYPES.map((type) => (
              <Chip
                key={type}
                active={splitType === type}
                onClick={() => setSplitType(type)}
              >
                {type}
              </Chip>
            ))}
          </div>
        </div>

        <Stepper
          label="Target length"
          value={estimatedMinutes}
          onChange={setEstimatedMinutes}
          step={5}
          min={10}
          max={240}
          integer
          suffix="min"
        />
      </Card>

      <section className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <SectionLabel>Exercises ({exercises.length})</SectionLabel>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>

        {exercises.length === 0 ? (
          <Card variant="dashed" padding="lg" className="text-center">
            <p className="text-[13px] text-fg-muted">
              No exercises yet — tap <span className="font-semibold">Add</span>{" "}
              to build the routine.
            </p>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={exercises.map((row) => row.rowId)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {exercises.map((row) => (
                  <SortableExerciseRow
                    key={row.rowId}
                    row={row}
                    onRemove={() => removeRow(row.rowId)}
                    onUpdate={(key, value) => updateField(row.rowId, key, value)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <div
        className="sticky bottom-0 -mx-4 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
      >
        <div className="flex gap-2">
          <Button
            variant="secondary"
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
              "Create routine"
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={addExercises}
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.rowId });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "touch-none rounded-card border border-border bg-card p-3",
        isDragging && "z-10 shadow-raised ring-2 ring-accent/40",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={`Reorder ${row.name}`}
          {...attributes}
          {...listeners}
          className="-ml-1 flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-fg-subtle hover:bg-inset hover:text-fg active:cursor-grabbing"
        >
          <GripVertical className="size-5" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-fg">{row.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              style={toneStyle(muscleHue(row.primaryMuscleGroup))}
              className="capitalize"
            >
              {row.primaryMuscleGroup}
            </Badge>
            <span className="text-[11px] font-medium capitalize text-fg-subtle">
              {row.equipment}
            </span>
          </div>
        </div>

        <button
          type="button"
          aria-label={`Remove ${row.name}`}
          onClick={onRemove}
          className="tappable flex size-8 shrink-0 items-center justify-center rounded-lg text-fg-subtle hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <CompactField label="Sets">
          <NumberInput
            aria-label={`Sets for ${row.name}`}
            value={row.defaultSets}
            onChange={(value) => onUpdate("defaultSets", value ?? 1)}
            min={1}
            max={20}
            integer
            className="h-10 border-border"
          />
        </CompactField>

        <CompactField label="Reps">
          <NumberInput
            aria-label={`Reps for ${row.name}`}
            value={row.defaultReps}
            onChange={(value) => onUpdate("defaultReps", value ?? 1)}
            min={1}
            max={100}
            integer
            className="h-10 border-border"
          />
        </CompactField>

        <CompactField label="Superset">
          <button
            type="button"
            onClick={() =>
              onUpdate("supersetGroup", nextSupersetGroup(row.supersetGroup))
            }
            aria-label={`Superset group for ${row.name}: ${supersetLabel(row.supersetGroup)}`}
            className={cn(
              "tappable flex h-10 w-full items-center justify-center rounded-lg border text-[15px] font-bold",
              row.supersetGroup === null
                ? "border-border bg-inset text-fg-subtle"
                : "border-accent bg-accent text-accent-fg",
            )}
          >
            {supersetLabel(row.supersetGroup)}
          </button>
        </CompactField>
      </div>
    </li>
  );
}

function CompactField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-fg-subtle">
        {label}
      </span>
      {children}
    </div>
  );
}
