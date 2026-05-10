import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { and, asc, eq, isNull } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  exercises as exercisesTable,
  templateExercises,
  workoutTemplates,
} from "@/lib/db/schema";
import {
  TemplateForm,
  type TemplateFormExercise,
} from "@/components/template-form";
import { StartWorkoutButton } from "@/components/start-workout-button";
import { GenerateButton } from "@/components/generate-dialog";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { id } = await params;

  const [template] = await db
    .select()
    .from(workoutTemplates)
    .where(
      and(
        eq(workoutTemplates.id, id),
        eq(workoutTemplates.userId, session.user.id),
        isNull(workoutTemplates.deletedAt),
      ),
    )
    .limit(1);

  if (!template) notFound();

  const exerciseRows = await db
    .select({
      exerciseId: templateExercises.exerciseId,
      defaultSets: templateExercises.defaultSets,
      defaultReps: templateExercises.defaultReps,
      supersetGroup: templateExercises.supersetGroup,
      name: exercisesTable.name,
      primaryMuscleGroup: exercisesTable.primaryMuscleGroup,
      equipment: exercisesTable.equipment,
    })
    .from(templateExercises)
    .innerJoin(exercisesTable, eq(templateExercises.exerciseId, exercisesTable.id))
    .where(eq(templateExercises.workoutTemplateId, template.id))
    .orderBy(asc(templateExercises.exerciseOrder));

  const formExercises: TemplateFormExercise[] = exerciseRows.map((r) => ({
    exerciseId: r.exerciseId,
    name: r.name,
    primaryMuscleGroup: r.primaryMuscleGroup,
    equipment: r.equipment,
    defaultSets: r.defaultSets,
    defaultReps: r.defaultReps,
    supersetGroup: r.supersetGroup,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/templates"
            aria-label="Back"
            className="-ml-2 inline-flex size-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            Edit template
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <GenerateButton
            templateId={template.id}
            defaultMinutes={template.estimatedMinutes}
          />
          <StartWorkoutButton templateId={template.id} size="sm" />
        </div>
      </div>

      <TemplateForm
        mode="edit"
        initial={{
          id: template.id,
          name: template.name,
          splitType: template.splitType,
          estimatedMinutes: template.estimatedMinutes,
          exercises: formExercises,
        }}
      />
    </div>
  );
}
