"use client";

import { useEffect, useState } from "react";
import { ShoppingCartIcon, PackageIcon, TruckIcon, CheckCircle2Icon, XCircleIcon, ClockIcon } from "lucide-react";
import { toast } from "sonner";

import { formatCurrency } from "@/lib/utils";
import { ordersApi } from "@/lib/api-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type VendorOrder = {
  id: number;
  status: string;
  total_amount: number;
  phone: string | null;
  shipping_address: string | null;
  created_at: string;
  buyer_email: string | null;
  buyer_username: string | null;
  item_count: number;
  first_product_name: string | null;
};

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "completed";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string; text: string; ring: string }> = {
  pending:    { label: "Pending",    icon: ClockIcon,        bg: "bg-amber-50",   text: "text-amber-700",  ring: "ring-amber-200" },
  processing: { label: "Processing", icon: PackageIcon,      bg: "bg-blue-50",    text: "text-blue-700",   ring: "ring-blue-200" },
  shipped:    { label: "Shipped",    icon: TruckIcon,        bg: "bg-violet-50",  text: "text-violet-700", ring: "ring-violet-200" },
  delivered:  { label: "Delivered",  icon: CheckCircle2Icon, bg: "bg-emerald-50", text: "text-emerald-700",ring: "ring-emerald-200" },
  completed:  { label: "Completed",  icon: CheckCircle2Icon, bg: "bg-emerald-50", text: "text-emerald-700",ring: "ring-emerald-200" },
  cancelled:  { label: "Cancelled",  icon: XCircleIcon,      bg: "bg-red-50",     text: "text-red-600",    ring: "ring-red-200" },
};

type StatusCfg = { label: string; icon: React.ElementType; bg: string; text: string; ring: string };
const FALLBACK_CFG: StatusCfg = { label: "Pending", icon: ClockIcon, bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" };
const getCfg = (s: string): StatusCfg => (STATUS_CONFIG[s] as StatusCfg | undefined) ?? FALLBACK_CFG;

const STATUS_FILTERS = ["all", "pending", "processing", "shipped", "delivered", "completed", "cancelled"] as const;
type FilterValue = (typeof STATUS_FILTERS)[number];

export const OrdersView = () => {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>("all");

  useEffect(() => {
    ordersApi.list().then((res) => {
      if (res.success && res.data) setOrders(res.data as unknown as VendorOrder[]);
      setIsLoading(false);
    });
  }, []);

  const handleStatusChange = async (orderId: number, status: string) => {
    const res = await ordersApi.updateStatus(orderId, status);
    if (res.success) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: status as OrderStatus } : o)));
      toast.success(`Order marked as ${status}`);
    } else {
      toast.error(res.error ?? "Failed to update status");
    }
  };

  const displayed = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const counts = STATUS_FILTERS.reduce<Record<string, number>>((acc, s) => {
    acc[s] = s === "all" ? orders.length : orders.filter((o) => o.status === s).length;
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900">Orders</h1>
        <p className="text-zinc-500 mt-1 text-sm">Track every sale and update delivery status.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {STATUS_FILTERS.map((s) => {
          const active = filter === s;
          const label = s === "all" ? "All" : getCfg(s).label;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                active
                  ? "bg-black text-white border-black"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
              }`}
            >
              {label}&nbsp;
              {(counts[s] ?? 0) > 0 && <span className={active ? "opacity-60" : "opacity-50"}>({counts[s]})</span>}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-zinc-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && orders.length === 0 && (
        <div className="text-center py-24 text-zinc-400">
          <ShoppingCartIcon className="size-14 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-semibold text-zinc-600">No orders yet</p>
          <p className="text-sm mt-1">When customers buy from you, orders will show up here.</p>
        </div>
      )}

      {!isLoading && displayed.length === 0 && orders.length > 0 && (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-sm">No orders with status <strong>{filter}</strong>.</p>
        </div>
      )}

      <div className="space-y-3">
        {displayed.map((order) => {
          const status = order.status ?? "pending";
          const cfg = getCfg(status);
          const StatusIcon = cfg.icon;
          const productLabel = order.first_product_name
            ? `${order.first_product_name}${(order.item_count ?? 1) > 1 ? ` +${order.item_count - 1} more` : ""}`
            : `Order #${order.id}`;

          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:shadow-md transition-all duration-200 p-5"
            >
              <div className="flex items-start gap-4">
                {/* Status icon */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} ring-1 ${cfg.ring}`}>
                  <StatusIcon className={`size-5 ${cfg.text}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-semibold text-zinc-900 truncate">{productLabel}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-zinc-400">#{order.id}</span>
                        <span className="text-xs text-zinc-500">{order.buyer_username ?? "—"}</span>
                        <span className="text-xs text-zinc-400 truncate">{order.buyer_email ?? ""}</span>
                      </div>
                      {order.shipping_address && (
                        <p className="text-xs text-zinc-400 mt-0.5">📍 {order.shipping_address}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-zinc-900">{formatCurrency(order.total_amount)}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                      <StatusIcon className="size-3" />
                      {cfg.label}
                    </span>
                    <Select value={status} onValueChange={(v) => handleStatusChange(order.id, v)}>
                      <SelectTrigger className="h-7 text-xs w-36 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
