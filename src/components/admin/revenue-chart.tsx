"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { RevenuePoint } from "@/lib/api-client";

interface Props {
  data: RevenuePoint[];
  loading?: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(val: number): string {
  return `Rs ${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">{formatDate(label)}</p>
      <p className="text-violet-600 dark:text-violet-400">
        Revenue: {formatCurrency(payload[0]?.value ?? 0)}
      </p>
      <p className="text-zinc-500 dark:text-zinc-400">
        Orders: {payload[1]?.value ?? 0}
      </p>
    </div>
  );
}

export function RevenueChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-4" />
        <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Revenue Over Time</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Daily completed orders</p>
        </div>
        <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
          Last 30 days
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#7c3aed"
            strokeWidth={2}
            fill="url(#revGrad)"
          />
          <Area
            type="monotone"
            dataKey="order_count"
            stroke="#06b6d4"
            strokeWidth={2}
            fill="none"
            strokeDasharray="4 2"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
