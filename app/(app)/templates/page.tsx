import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Plus, Dumbbell } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { templateExercises, workoutTemplates, type SplitType } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { StartWorkoutButton } from "@/components/start-workout-button";
import { TemplateCardActions } from "./template-card-actions";

const SPLIT_COLORS: Record<SplitType, string> = {
  push: "bg-rose-100 text-rose-700",
  pull: "bg-sky-100 text-sky-700",
  legs: "bg-amber-100 text-amber-800",
  upper: "bg-violet-100 text-violet-700",
  lower: "bg-emerald-100 text-emerald-700",
  full: "bg-indigo-100 text-indigo-700",
  custom: "bg-neutral-100 text-neutral-600",
};

export default async function TemplatesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const templates = await db
    .select({
      id: workoutTemplates.id,
      name: workoutTemplates.name,
      splitType: workoutTemplates.splitType,
      estimatedMinutes: workoutTemplates.estimatedMinutes,
      updatedAt: workoutTemplates.updatedAt,
      exerciseCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${templateExercises}
        WHERE ${templateExercises.workoutTemplateId} = ${workoutTemplates.id}
      )`.as("exercise_count"),
    })
    .from(workoutTemplates)
    .where(
      and(
        eq(workoutTemplates.userId, session.user.id),
        isNull(workoutTemplates.deletedAt),
      ),
    )
    .orderBy(desc(workoutTemplates.updatedAt));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <Link href="/templates/new">
          <Button size="sm">
            <Plus className="size-4" />
            New
          </Button>
        </Link>
      </header>

      {templates.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3">
          {templates.map((t) => (
            <li
              key={t.id}
              className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <Link href={`/templates/${t.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SPLIT_COLORS[t.splitType]}`}
                    >
                      {t.splitType}
                    </span>
                    <h2 className="truncate text-base font-medium">{t.name}</h2>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {t.exerciseCount} exercises · ~{t.estimatedMinutes} min
                  </p>
                </Link>
                <TemplateCardActions id={t.id} name={t.name} />
              </div>
              <div className="mt-3">
                <StartWorkoutButton templateId={t.id} fullWidth />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
      <Dumbbell className="mx-auto size-8 text-neutral-400" />
      <h2 className="mt-3 text-base font-medium">No templates yet</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Create your first split — push, pull, legs, whatever you want.
      </p>
      <Link href="/templates/new" className="mt-5 inline-block">
        <Button>
          <Plus className="size-4" />
          Create template
        </Button>
      </Link>
    </div>
  );
}
