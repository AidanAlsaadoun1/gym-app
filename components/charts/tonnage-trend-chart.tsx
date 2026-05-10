"use client";

import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface WeeklyPoint {
  /** ISO date string of the Monday of the week. */
  weekStart: string;
  tonnage: number;
}

export function TonnageTrendChart({ data }: { data: WeeklyPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="px-2 py-6 text-center text-sm text-neutral-500">
        Logged sessions will plot here.
      </p>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: format(new Date(d.weekStart), "d MMM"),
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formatted}
          margin={{ top: 8, right: 8, left: -16, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={48} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 12,
            }}
            formatter={(value: number) => [`${Math.round(value)} kg`, "tonnage"]}
          />
          <Line
            type="monotone"
            dataKey="tonnage"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
