"use client";

import { cn } from "@/lib/utils";

interface Order {
  id: number;
  username: string;
  email: string;
  tenant_name: string;
  status: string;
  total_amount: number;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-amber-100  dark:bg-amber-900/30  text-amber-700  dark:text-amber-400",
  processing: "bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-400",
  completed:  "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  cancelled:  "bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-400",
  refunded:   "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
};

interface Props {
  orders: Order[];
  loading?: boolean;
}

export function RecentOrdersTable({ orders, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="h-6 w-36 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse mb-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Recent Orders</h3>
        <a href="/admin/orders" className="text-xs text-violet-600 dark:text-violet-400 hover:underline">
          View all →
        </a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              {["Order", "Customer", "Tenant", "Amount", "Status", "Date"].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-zinc-400 text-sm">
                  No orders yet
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <td className="px-5 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                    #{order.id}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{order.username}</div>
                    <div className="text-xs text-zinc-400">{order.email}</div>
                  </td>
                  <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{order.tenant_name}</td>
                  <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                    Rs {Number(order.total_amount).toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                        STATUS_STYLES[order.status] ?? "bg-zinc-100 text-zinc-600"
                      )}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-zinc-400">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
