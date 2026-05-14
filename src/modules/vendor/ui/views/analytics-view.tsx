"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUpIcon, ShoppingCartIcon, PackageIcon, BarChart2Icon } from "lucide-react";

import { vendorApi, type VendorAnalytics } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending:    "#f59e0b",
  processing: "#3b82f6",
  shipped:    "#8b5cf6",
  delivered:  "#10b981",
  completed:  "#10b981",
  cancelled:  "#ef4444",
};

const PIE_FALLBACK = ["#e879f9","#818cf8","#38bdf8","#34d399","#fb923c","#f87171"];

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className={`rounded-2xl p-5 flex items-center gap-4 ${color}`}>
      <div className="w-11 h-11 rounded-xl bg-white/30 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm opacity-80">{label}</p>
      </div>
    </div>
  );
}

export const AnalyticsView = () => {
  const [data, setData] = useState<VendorAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    vendorApi.analytics().then((res) => {
      if (res.success && res.data) setData(res.data);
      setIsLoading(false);
    });
  }, []);

  const totalRevenue = data?.revenue_chart.reduce((s, d) => s + Number(d.revenue), 0) ?? 0;
  const totalOrders  = data?.orders_by_status.reduce((s, d) => s + Number(d.count), 0) ?? 0;
  const topRevProduct = data?.top_products[0];

  const chartData = (data?.revenue_chart ?? []).map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-PK", { month: "short", day: "numeric" }),
    revenue: Number(d.revenue),
    orders: Number(d.order_count),
  }));

  const pieData = (data?.orders_by_status ?? []).map((d, i) => ({
    name: d.status.charAt(0).toUpperCase() + d.status.slice(1),
    value: Number(d.count),
    color: STATUS_COLORS[d.status] ?? PIE_FALLBACK[i % PIE_FALLBACK.length],
  }));

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
        {[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-zinc-200 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900">Analytics</h1>
        <p className="text-zinc-500 mt-1 text-sm">Last 30 days performance overview.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Revenue (30d)"
          value={formatCurrency(totalRevenue)}
          icon={TrendingUpIcon}
          color="bg-gradient-to-br from-violet-500 to-purple-600 text-white"
        />
        <StatCard
          label="Total Orders"
          value={String(totalOrders)}
          icon={ShoppingCartIcon}
          color="bg-gradient-to-br from-blue-500 to-sky-600 text-white"
        />
        <StatCard
          label="Top Product"
          value={topRevProduct?.name.slice(0, 16) + (topRevProduct && topRevProduct.name.length > 16 ? "…" : "") || "—"}
          icon={PackageIcon}
          color="bg-gradient-to-br from-emerald-500 to-teal-600 text-white col-span-2 lg:col-span-1"
        />
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <BarChart2Icon className="w-4 h-4 text-violet-500" />
          <h2 className="font-semibold text-zinc-900">Revenue — last 30 days</h2>
        </div>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">No sales in this period.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#revGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Orders by status + Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900 mb-4">Orders by status</h2>
          {pieData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-zinc-400 text-sm">No orders yet.</div>
          ) : (
            <div className="flex items-center gap-6">
              <PieChart width={130} height={130}>
                <Pie data={pieData} cx={60} cy={60} innerRadius={38} outerRadius={60} dataKey="value" strokeWidth={2}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div className="space-y-2 flex-1">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-zinc-600">{d.name}</span>
                    </div>
                    <span className="font-semibold text-zinc-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900 mb-4">Top products by revenue</h2>
          {(data?.top_products ?? []).length === 0 ? (
            <div className="h-40 flex items-center justify-center text-zinc-400 text-sm">No sales yet.</div>
          ) : (
            <div className="space-y-3">
              {data!.top_products.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-600 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{p.name}</p>
                    <p className="text-xs text-zinc-400">{p.total_sold} sold</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 shrink-0">{formatCurrency(Number(p.revenue))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
