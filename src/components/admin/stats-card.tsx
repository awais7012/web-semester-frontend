import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: "violet" | "blue" | "emerald" | "amber" | "rose";
  prefix?: string;
  suffix?: string;
}

const colorMap = {
  violet: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
  blue:   "bg-blue-100   dark:bg-blue-900/30   text-blue-600   dark:text-blue-400",
  emerald:"bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  amber:  "bg-amber-100  dark:bg-amber-900/30  text-amber-600  dark:text-amber-400",
  rose:   "bg-rose-100   dark:bg-rose-900/30   text-rose-600   dark:text-rose-400",
};

export function StatsCard({ title, value, icon: Icon, trend, trendLabel, color = "violet", prefix, suffix }: Props) {
  const positive = trend !== undefined && trend >= 0;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={cn("p-2.5 rounded-lg", colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              positive
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
            )}
          >
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{title}</p>
        {trendLabel && (
          <p className="text-xs text-zinc-400 mt-1">{trendLabel}</p>
        )}
      </div>
    </div>
  );
}
