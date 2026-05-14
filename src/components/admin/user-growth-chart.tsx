"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { GrowthPoint } from "@/lib/api-client";

interface Props {
  data: GrowthPoint[];
  loading?: boolean;
}

function formatMonth(m: string): string {
  const [year, month] = m.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", { month: "short" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">{label}</p>
      <p className="text-emerald-600 dark:text-emerald-400">+{payload[0]?.value} new users</p>
    </div>
  );
}

export function UserGrowthChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-4" />
        <div className="h-52 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
      </div>
    );
  }

  const chartData = data.map((d) => ({ ...d, label: formatMonth(d.month) }));

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">User Growth</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">New registrations per month</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(16,185,129,0.06)" }} />
          <Bar dataKey="new_users" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
