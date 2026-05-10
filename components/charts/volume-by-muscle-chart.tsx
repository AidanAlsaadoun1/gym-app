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

export interface MuscleVolumePoint {
  muscleGroup: string;
  tonnage: number;
  workingSets: number;
}

export function VolumeByMuscleChart({ data }: { data: MuscleVolumePoint[] }) {
  if (data.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-sm text-neutral-500">
        No working sets logged this week yet.
      </p>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -16, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="muscleGroup"
            tick={{ fontSize: 11 }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fontSize: 11 }} width={48} />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 12,
            }}
            formatter={(value: number, name: string) =>
              name === "tonnage" ? [`${Math.round(value)} kg`, "tonnage"] : value
            }
          />
          <Bar dataKey="tonnage" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
