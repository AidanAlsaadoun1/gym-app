"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip, formatAxisKg } from "./chart-parts";

export interface MuscleVolumePoint {
  muscleGroup: string;
  tonnage: number;
  workingSets: number;
}

export function VolumeByMuscleChart({ data }: { data: MuscleVolumePoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-fg-muted">
        No working sets logged this week yet.
      </p>
    );
  }

  // Sorted by magnitude — this chart answers "what did I train most", and
  // sorting means reading it left to right instead of hunting.
  const sorted = [...data].sort((a, b) => b.tonnage - a.tonnage);

  return (
    <div className="chart h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          margin={{ top: 8, right: 6, left: -18, bottom: 0 }}
          barCategoryGap="22%"
        >
          <CartesianGrid vertical={false} strokeDasharray="2 4" />
          <XAxis
            dataKey="muscleGroup"
            interval={0}
            angle={-38}
            textAnchor="end"
            height={52}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatAxisKg}
          />
          <Tooltip
            content={
              <ChartTooltip
                secondary={(entry) =>
                  entry && typeof entry.workingSets === "number"
                    ? `${entry.workingSets} working ${entry.workingSets === 1 ? "set" : "sets"}`
                    : null
                }
              />
            }
          />
          <Bar dataKey="tonnage" radius={[4, 4, 0, 0]} maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
