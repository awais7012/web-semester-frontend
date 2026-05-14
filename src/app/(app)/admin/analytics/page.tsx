"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { adminApi, type RevenuePoint, type TenantPerf } from "@/lib/api-client";
import { AdminTopNavbar } from "@/components/admin/top-navbar";

const COLORS = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-zinc-800 dark:text-zinc-200 mb-1">{formatDate(label)}</p>
      <p className="text-violet-600">Revenue: Rs {Number(payload[0]?.value ?? 0).toLocaleString()}</p>
      <p className="text-blue-500">Orders: {payload[1]?.value ?? 0}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [revenue, setRevenue]       = useState<RevenuePoint[]>([]);
  const [tenants, setTenants]       = useState<TenantPerf[]>([]);
  const [days, setDays]             = useState(30);
  const [loading, setLoading]       = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [r, t] = await Promise.all([
      adminApi.revenueChart(days),
      adminApi.tenantPerformance(),
    ]);
    if (r.success && r.data) setRevenue(r.data);
    if (t.success && t.data) setTenants(t.data);
    setLoading(false);
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalRevenue = revenue.reduce((s, d) => s + Number(d.revenue), 0);
  const totalOrders  = revenue.reduce((s, d) => s + Number(d.order_count), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="flex flex-col min-h-full">
      <AdminTopNavbar title="Analytics" />

      <div className="flex-1 p-6 space-y-6">
        {/* Controls */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Time range:</span>
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                days === d
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Revenue", value: `Rs ${totalRevenue.toLocaleString()}`, color: "text-violet-600" },
            { label: "Total Orders",  value: totalOrders.toString(),               color: "text-blue-600" },
            { label: "Avg Order Value", value: `Rs ${Math.round(avgOrderValue).toLocaleString()}`, color: "text-emerald-600" },
          ].map((card) => (
            <div key={card.label} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.color}`}>{loading ? "—" : card.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue line chart */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Revenue &amp; Orders — Last {days} Days</h3>
          {loading ? (
            <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="rev" tickFormatter={(v) => `Rs ${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<RevenueTooltip />} />
                <Legend />
                <Line yAxisId="rev" type="monotone" dataKey="revenue"     stroke="#7c3aed" strokeWidth={2} dot={false} name="Revenue" />
                <Line yAxisId="ord" type="monotone" dataKey="order_count" stroke="#3b82f6" strokeWidth={2} dot={false} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tenant performance */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Bar chart */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Revenue by Tenant</h3>
            {loading ? (
              <div className="h-52 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={tenants} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => `Rs ${v}`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => [`Rs ${Number(v).toLocaleString()}`, "Revenue"]} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {tenants.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie chart */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Revenue Share</h3>
            {loading ? (
              <div className="h-52 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={tenants}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {tenants.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`Rs ${Number(v).toLocaleString()}`, "Revenue"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tenant leaderboard */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Vendor Leaderboard</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  {["#", "Tenant", "Products", "Orders", "Revenue"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : tenants.map((t, i) => (
                  <tr key={t.id} className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-5 py-3 font-bold text-zinc-400">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">{t.name}</td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{t.product_count}</td>
                    <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{t.order_count}</td>
                    <td className="px-5 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      Rs {Number(t.revenue).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
