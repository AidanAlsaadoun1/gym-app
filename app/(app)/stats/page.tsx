import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { addWeeks, format } from "date-fns";

import { auth } from "@/lib/auth";
import {
  volumeByMuscle,
  weeklyTonnage,
  type MuscleVolume,
} from "@/lib/stats/queries";
import { nWeeksAgoStart, weekStart } from "@/lib/stats/dates";
import { muscleGroupEnum } from "@/lib/db/schema";
import { VolumeByMuscleChart } from "@/components/charts/volume-by-muscle-chart";
import { TonnageTrendChart } from "@/components/charts/tonnage-trend-chart";

const ALL_MUSCLES = muscleGroupEnum.enumValues;

export default async function StatsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const now = new Date();
  const thisWeekStart = weekStart(now);
  const nextWeekStart = addWeeks(thisWeekStart, 1);

  const [muscleVolume, trendRows] = await Promise.all([
    volumeByMuscle(session.user.id, thisWeekStart, nextWeekStart),
    weeklyTonnage(session.user.id, nWeeksAgoStart(12, now)),
  ]);

  // Fill missing muscle groups with zeros so the bar chart always shows the
  // same x-axis labels regardless of what the user trained.
  const byMuscle = new Map(
    muscleVolume.map((m) => [m.muscleGroup, m] as const),
  );
  const muscleData = ALL_MUSCLES.map((m) => {
    const row: MuscleVolume = byMuscle.get(m) ?? {
      muscleGroup: m,
      tonnage: 0,
      workingSets: 0,
    };
    return {
      muscleGroup: m,
      tonnage: row.tonnage,
      workingSets: row.workingSets,
    };
  }).filter((d) => d.tonnage > 0 || d.workingSets > 0);

  const totalTonnageThisWeek = muscleVolume.reduce(
    (acc, m) => acc + m.tonnage,
    0,
  );
  const totalSetsThisWeek = muscleVolume.reduce(
    (acc, m) => acc + m.workingSets,
    0,
  );

  const trendData = trendRows.map((r) => ({
    weekStart: r.weekStart.toISOString(),
    tonnage: r.tonnage,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
        <p className="text-sm text-neutral-500">
          Week of {format(thisWeekStart, "EEE d MMM")}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-2">
        <Stat label="Tonnage this week" value={formatTonnage(totalTonnageThisWeek)} />
        <Stat label="Working sets" value={String(totalSetsThisWeek)} />
      </section>

      <Card title="Volume by muscle group">
        <VolumeByMuscleChart data={muscleData} />
        {muscleData.length > 0 ? (
          <ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-neutral-500">
            {muscleData.map((m) => (
              <li
                key={m.muscleGroup}
                className="flex items-center justify-between rounded-md border border-neutral-100 px-2 py-1"
              >
                <span className="capitalize">{m.muscleGroup}</span>
                <span className="font-medium tabular-nums text-neutral-700">
                  {m.workingSets}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Card title="Tonnage — last 12 weeks">
        <TonnageTrendChart data={trendData} />
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function formatTonnage(kg: number): string {
  if (kg === 0) return "0 kg";
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)} kg`;
}
