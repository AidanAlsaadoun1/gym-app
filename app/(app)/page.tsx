import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Dumbbell, Plus } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workoutTemplates } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { StartWorkoutButton } from "@/components/start-workout-button";
import { SignOutButton } from "@/components/sign-out-button";
import { BugReportButton } from "@/components/bug-report-dialog";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const recent = await db
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
    .orderBy(desc(workoutTemplates.updatedAt))
    .limit(3);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-neutral-500">
            Welcome back{session.user.name ? `, ${session.user.name}` : ""}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
        </div>
        <SignOutButton />
      </header>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-medium">Start a workout</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Pick a template to begin logging sets.
        </p>

        {recent.length === 0 ? (
          <div className="mt-4">
            <Link href="/templates/new">
              <Button className="w-full">
                <Plus className="size-4" />
                Create your first template
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {recent.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2.5"
              >
                <Link href={`/templates/${t.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Dumbbell className="size-4 shrink-0 text-neutral-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.name}</p>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      {t.splitType} · ~{t.estimatedMinutes} min
                    </p>
                  </div>
                </Link>
                <StartWorkoutButton templateId={t.id} size="sm" />
              </li>
            ))}
            <li>
              <Link
                href="/templates"
                className="block rounded-xl px-3 py-2 text-center text-sm text-neutral-600 hover:bg-neutral-50"
              >
                See all templates →
              </Link>
            </li>
          </ul>
        )}
      </section>

      <footer className="pt-2 text-center">
        <BugReportButton />
      </footer>
    </div>
  );
}
