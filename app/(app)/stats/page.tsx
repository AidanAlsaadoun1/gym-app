import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { addWeeks, format, subWeeks } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";

import { auth } from "@/lib/auth";
import {
  periodSummary,
  volumeByMuscle,
  weeklyTonnage,
  type MuscleVolume,
} from "@/lib/stats/queries";
import { nWeeksAgoStart, weekStart } from "@/lib/stats/dates";
import { muscleGroupEnum } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/ui/label";
import { Stat } from "@/components/ui/stat";
import { VolumeByMuscleChart } from "@/components/charts/volume-by-muscle-chart";
import { TonnageTrendChart } from "@/components/charts/tonnage-trend-chart";
import { muscleHue, toneFill } from "@/lib/ui/tones";
import { formatTonnage, splitTonnage } from "@/lib/ui/format";
import { cn } from "@/lib/utils";

const ALL_MUSCLES = muscleGroupEnum.enumValues;
const TREND_WEEKS = 12;

export const metadata = { title: "Stats" };

export default async function StatsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const now = new Date();
  const thisWeekStart = weekStart(now);
  const nextWeekStart = addWeeks(thisWeekStart, 1);
  const lastWeekStart = subWeeks(thisWeekStart, 1);

  const [muscleVolume, trendRows, thisWeek, lastWeek] = await Promise.all([
    volumeByMuscle(session.user.id, thisWeekStart, nextWeekStart),
    weeklyTonnage(session.user.id, nWeeksAgoStart(TREND_WEEKS, now), TREND_WEEKS),
    periodSummary(session.user.id, thisWeekStart, nextWeekStart),
    periodSummary(session.user.id, lastWeekStart, thisWeekStart),
  ]);

  const byMuscle = new Map(muscleVolume.map((m) => [m.muscleGroup, m] as const));
  const muscleData = ALL_MUSCLES.map((muscle) => {
    const row: MuscleVolume =
      byMuscle.get(muscle) ??
      { muscleGroup: muscle, tonnage: 0, workingSets: 0 };
    return {
      muscleGroup: muscle,
      tonnage: row.tonnage,
      workingSets: row.workingSets,
    };
  }).filter((row) => row.tonnage > 0 || row.workingSets > 0);

  const volume = splitTonnage(thisWeek.tonnage);
  const delta =
    lastWeek.tonnage > 0
      ? (thisWeek.tonnage - lastWeek.tonnage) / lastWeek.tonnage
      : null;

  const trendData = trendRows.map((row) => ({
    weekStart: row.weekStart.toISOString(),
    tonnage: row.tonnage,
  }));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[28px] font-bold tracking-tight text-fg">Stats</h1>
        <p className="mt-0.5 text-[13px] text-fg-muted">
          Week of {format(thisWeekStart, "d MMM")}
        </p>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <Stat
          label="Volume"
          value={volume.value}
          unit={volume.unit}
          tone="accent"
        />
        <Stat label="Sets" value={String(thisWeek.workingSets)} />
        <Stat label="Workouts" value={String(thisWeek.sessionCount)} />
      </section>

      {delta !== null ? (
        <Card padding="sm" className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              delta >= 0
                ? "bg-success-soft text-success"
                : "bg-warning-soft text-warning",
            )}
          >
            {delta >= 0 ? (
              <TrendingUp className="size-4" />
            ) : (
              <TrendingDown className="size-4" />
            )}
          </span>
          <p className="text-[13px] text-fg-muted">
            <span className="font-bold text-fg">
              {delta >= 0 ? "+" : ""}
              {Math.round(delta * 100)}%
            </span>{" "}
            volume vs last week ({formatTonnage(lastWeek.tonnage)})
          </p>
        </Card>
      ) : null}

      <section>
        <SectionLabel>Volume by muscle · this week</SectionLabel>
        <Card className="mt-2" padding="sm">
          <VolumeByMuscleChart data={muscleData} />
          {muscleData.length > 0 ? (
            <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 px-1">
              {muscleData.map((row) => (
                <li
                  key={row.muscleGroup}
                  className="flex items-center gap-2 py-0.5"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={toneFill(muscleHue(row.muscleGroup))}
                  />
                  <span className="flex-1 truncate text-[12px] capitalize text-fg-muted">
                    {row.muscleGroup}
                  </span>
                  <span className="text-[12px] font-bold tabular-nums text-fg">
                    {row.workingSets}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </section>

      <section>
        <SectionLabel>Weekly volume · last {TREND_WEEKS} weeks</SectionLabel>
        <Card className="mt-2" padding="sm">
          <TonnageTrendChart data={trendData} />
        </Card>
      </section>
    </div>
  );
}
