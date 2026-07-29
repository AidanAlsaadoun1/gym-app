"use client";

import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip, formatAxisKg } from "./chart-parts";

export interface WeeklyPoint {
  /** ISO date string of the Monday of the week. */
  weekStart: string;
  tonnage: number;
}

export function TonnageTrendChart({ data }: { data: WeeklyPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-fg-muted">
        Finish a workout and the trend starts here.
      </p>
    );
  }

  const formatted = data.map((point) => ({
    ...point,
    label: format(new Date(point.weekStart), "d MMM"),
  }));

  // Twelve weekly labels won't fit on a phone — show every other one.
  const labelInterval = formatted.length > 8 ? 1 : 0;

  return (
    <div className="chart h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formatted}
          margin={{ top: 8, right: 6, left: -18, bottom: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="2 4" />
          <XAxis
            dataKey="label"
            interval={labelInterval}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatAxisKg}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="tonnage"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
