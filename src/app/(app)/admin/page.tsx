"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Building2,
  Clock,
} from "lucide-react";
import { adminApi, type AdminStats, type RevenuePoint, type StatusCount, type TopProduct, type GrowthPoint } from "@/lib/api-client";
import { AdminTopNavbar } from "@/components/admin/top-navbar";
import { StatsCard } from "@/components/admin/stats-card";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { OrdersPieChart } from "@/components/admin/orders-pie-chart";
import { UserGrowthChart } from "@/components/admin/user-growth-chart";
import { RecentOrdersTable } from "@/components/admin/recent-orders-table";
import { TopProductsList } from "@/components/admin/top-products";

export default function AdminDashboard() {
  const [stats, setStats]             = useState<AdminStats | null>(null);
  const [revenue, setRevenue]         = useState<RevenuePoint[]>([]);
  const [statusData, setStatusData]   = useState<StatusCount[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [growth, setGrowth]           = useState<GrowthPoint[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.stats(),
      adminApi.revenueChart(30),
      adminApi.ordersByStatus(),
      adminApi.topProducts(8),
      adminApi.recentOrders(10),
      adminApi.userGrowth(),
    ]).then(([s, r, st, tp, ro, g]) => {
      if (s.success && s.data)   setStats(s.data);
      if (r.success && r.data)   setRevenue(r.data);
      if (st.success && st.data) setStatusData(st.data);
      if (tp.success && tp.data) setTopProducts(tp.data);
      if (ro.success && ro.data) setRecentOrders(ro.data as unknown[]);
      if (g.success && g.data)   setGrowth(g.data);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      <AdminTopNavbar title="Dashboard" />

      <div className="flex-1 p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatsCard
            title="Total Revenue"
            value={loading ? "—" : `Rs ${Number(stats?.total_revenue ?? 0).toLocaleString()}`}
            icon={DollarSign}
            color="violet"
            trend={undefined}
          />
          <StatsCard
            title="Total Orders"
            value={loading ? "—" : (stats?.total_orders ?? 0)}
            icon={ShoppingCart}
            color="blue"
          />
          <StatsCard
            title="Pending Orders"
            value={loading ? "—" : (stats?.pending_orders ?? 0)}
            icon={Clock}
            color="amber"
          />
          <StatsCard
            title="Total Users"
            value={loading ? "—" : (stats?.total_users ?? 0)}
            icon={Users}
            color="emerald"
            trendLabel={loading ? "" : `+${stats?.new_users_30d ?? 0} this month`}
          />
          <StatsCard
            title="Products"
            value={loading ? "—" : (stats?.total_products ?? 0)}
            icon={Package}
            color="rose"
          />
          <StatsCard
            title="Tenants"
            value={loading ? "—" : (stats?.total_tenants ?? 0)}
            icon={Building2}
            color="violet"
          />
        </div>

        {/* Revenue Chart + Orders Pie */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <RevenueChart data={revenue} loading={loading} />
          </div>
          <OrdersPieChart data={statusData} loading={loading} />
        </div>

        {/* Recent Orders + Top Products */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <RecentOrdersTable orders={recentOrders} loading={loading} />
          </div>
          <TopProductsList products={topProducts} loading={loading} />
        </div>

        {/* User Growth */}
        <UserGrowthChart data={growth} loading={loading} />
      </div>
    </div>
  );
}
