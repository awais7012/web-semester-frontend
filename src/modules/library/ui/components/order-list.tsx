"use client";

import { useEffect, useState } from "react";
import { PackageIcon, TruckIcon, CheckCircle2Icon, ClockIcon, XCircleIcon, CheckIcon } from "lucide-react";
import { ordersApi, type Order } from "@/lib/api-client";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: "Pending",    color: "text-yellow-600 bg-yellow-50 ring-yellow-200",  icon: ClockIcon },
  processing: { label: "Processing", color: "text-blue-600 bg-blue-50 ring-blue-200",        icon: PackageIcon },
  shipped:    { label: "Shipped",    color: "text-violet-600 bg-violet-50 ring-violet-200",  icon: TruckIcon },
  delivered:  { label: "Delivered",  color: "text-emerald-600 bg-emerald-50 ring-emerald-200", icon: CheckCircle2Icon },
  completed:  { label: "Completed",  color: "text-emerald-600 bg-emerald-50 ring-emerald-200", icon: CheckIcon },
  cancelled:  { label: "Cancelled",  color: "text-red-600 bg-red-50 ring-red-200",           icon: XCircleIcon },
};

export const OrderList = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    ordersApi.list({ limit: 50 }).then((res) => {
      if (res.success && res.data) setOrders(res.data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 animate-pulse h-28" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-24 text-zinc-400">
        <PackageIcon className="size-14 mx-auto mb-4 opacity-20" />
        <p className="text-lg font-semibold text-zinc-600">No orders yet</p>
        <p className="text-sm mt-1">Your order history will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
        const Icon = cfg.icon;
        const firstName = order.items[0]?.product_name ?? "Order";
        const extra = order.items.length > 1 ? ` +${order.items.length - 1} more` : "";

        return (
          <div key={order.id} className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="shrink-0 w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
              {order.items[0]?.image_url
                ? <img src={order.items[0].image_url} alt="" className="w-12 h-12 object-cover rounded-xl" />
                : <PackageIcon className="size-5 text-zinc-400" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-zinc-900 truncate">{firstName}{extra}</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Order #{order.id} · {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-end gap-1">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ring-1 ${cfg.color}`}>
                <Icon className="size-3" />
                {cfg.label}
              </span>
              <span className="text-sm font-semibold text-zinc-700">Rs {Number(order.total_amount).toLocaleString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
