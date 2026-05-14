"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { ordersApi } from "@/lib/api-client";
import { AdminTopNavbar } from "@/components/admin/top-navbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Order {
  id: number;
  username: string;
  email: string;
  tenant_name: string;
  status: "pending" | "processing" | "completed" | "cancelled" | "refunded";
  total_amount: number;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending:    "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  processing: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  completed:  "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  cancelled:  "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  refunded:   "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
};

const STATUSES = ["pending", "processing", "completed", "cancelled", "refunded"];

export default function OrdersPage() {
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatus] = useState("");
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const limit = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit };
    if (statusFilter) params.status = statusFilter;
    const res = await ordersApi.list(params);
    if (res.success && res.data) {
      setOrders(res.data as unknown as Order[]);
      setTotal(res.pagination?.total ?? 0);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function updateStatus(id: number, status: string) {
    const res = await ordersApi.updateStatus(id, status);
    if (res.success) {
      toast.success("Status updated");
      fetchOrders();
    } else {
      toast.error("Failed to update status");
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col min-h-full">
      <AdminTopNavbar title="Orders" />

      <div className="flex-1 p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            className="h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm px-3 text-zinc-700 dark:text-zinc-300"
            value={statusFilter}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 self-center ml-2">
            {total} order{total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  {["#", "Customer", "Tenant", "Amount", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-zinc-400">No orders found</td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-zinc-400">#{order.id}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{order.username}</div>
                        <div className="text-xs text-zinc-400">{order.email}</div>
                      </td>
                      <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{order.tenant_name}</td>
                      <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                        ${Number(order.total_amount).toFixed(2)}
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          className={cn(
                            "text-xs font-medium px-2 py-1 rounded-full border-none outline-none cursor-pointer capitalize",
                            STATUS_STYLES[order.status]
                          )}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-400 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => window.open(`/admin/orders/${order.id}`, "_self")}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-400">Page {page} of {totalPages}</p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
