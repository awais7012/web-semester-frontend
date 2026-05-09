"use client";

import { useQuery } from "@tanstack/react-query";
import { ShoppingCartIcon } from "lucide-react";

import { useTRPC } from "@/trpc/client";
import { Product, User } from "@/payload-types";

export const OrdersView = () => {
  const trpc = useTRPC();
  const orders = useQuery(trpc.vendor.getOrders.queryOptions({}));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-gray-500 mt-1">Every sale your store has made.</p>
      </div>

      {orders.isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {!orders.isLoading && orders.data?.docs.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <ShoppingCartIcon className="size-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No sales yet.</p>
          <p className="text-sm mt-1">When someone buys your product, it'll show up here.</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.data?.docs.map((order) => {
          const product = order.product as Product | null;
          const buyer = order.user as User | null;

          return (
            <div
              key={order.id}
              className="bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl p-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{product?.name ?? order.name}</p>
                <p className="text-sm text-gray-500">
                  Buyer: {buyer?.email ?? "—"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold">
                  ${typeof product?.price === "number" ? product.price.toFixed(2) : "—"}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
