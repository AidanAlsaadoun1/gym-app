import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { Dumbbell, Plus } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  exercises as exercisesTable,
  templateExercises,
  workoutTemplates,
} from "@/lib/db/schema";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RoutineCard } from "@/components/routine-card";
import { TemplateCardActions } from "./template-card-actions";
import { cn } from "@/lib/utils";

/** How many exercise names each card previews before collapsing to "+N more". */
const PREVIEW_LIMIT = 4;

export const metadata = { title: "Routines" };

export default async function TemplatesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const templates = await db
    .select({
      id: workoutTemplates.id,
      name: workoutTemplates.name,
      splitType: workoutTemplates.splitType,
      estimatedMinutes: workoutTemplates.estimatedMinutes,
    })
    .from(workoutTemplates)
    .where(
      and(
        eq(workoutTemplates.userId, session.user.id),
        isNull(workoutTemplates.deletedAt),
      ),
    )
    .orderBy(desc(workoutTemplates.updatedAt));

  // Exercise names for the card previews, grouped in JS so the card query stays
  // a plain select rather than a correlated array aggregate.
  const exerciseRows =
    templates.length > 0
      ? await db
          .select({
            templateId: templateExercises.workoutTemplateId,
            name: exercisesTable.name,
          })
          .from(templateExercises)
          .innerJoin(
            exercisesTable,
            eq(templateExercises.exerciseId, exercisesTable.id),
          )
          .where(
            inArray(
              templateExercises.workoutTemplateId,
              templates.map((t) => t.id),
            ),
          )
          .orderBy(asc(templateExercises.exerciseOrder))
      : [];

  const namesByTemplate = new Map<string, string[]>();
  for (const row of exerciseRows) {
    const list = namesByTemplate.get(row.templateId);
    if (list) list.push(row.name);
    else namesByTemplate.set(row.templateId, [row.name]);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[28px] font-bold tracking-tight text-fg">
          Routines
        </h1>
        <Link
          href="/templates/new"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          <Plus className="size-4" />
          New
        </Link>
      </header>

      {templates.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="No routines yet"
          description="A routine is a reusable list of exercises with target sets and reps. Build one and starting a workout is a single tap."
          action={
            <Link href="/templates/new" className={cn(buttonVariants())}>
              <Plus className="size-4" />
              Create a routine
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {templates.map((template) => {
            const names = namesByTemplate.get(template.id) ?? [];
            return (
              <li key={template.id}>
                <RoutineCard
                  routine={{
                    ...template,
                    exerciseCount: names.length,
                    exerciseNames: names.slice(0, PREVIEW_LIMIT),
                  }}
                  actions={
                    <TemplateCardActions
                      id={template.id}
                      name={template.name}
                      defaultMinutes={template.estimatedMinutes}
                    />
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
