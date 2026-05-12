"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingCartIcon } from "lucide-react";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";
import { Product, User } from "@/payload-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type OrderStatus = "pending" | "processing" | "shipped" | "delivered";

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
};

export const OrdersView = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const orders = useQuery(trpc.vendor.getOrders.queryOptions({}));

  const updateStatus = useMutation(
    trpc.vendor.updateOrderStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.vendor.getOrders.queryFilter({}));
        toast.success("Order status updated");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-gray-500 mt-1">Every sale your store has made.</p>
      </div>

      {orders.isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {!orders.isLoading && orders.data?.docs.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <ShoppingCartIcon className="size-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No sales yet.</p>
          <p className="text-sm mt-1">When someone buys your product, it&apos;ll show up here.</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.data?.docs.map((order) => {
          const product = order.product as Product | null;
          const buyer = order.user as User | null;
          const orderAny = order as any;
          const status: OrderStatus = orderAny.status ?? "pending";

          return (
            <div
              key={order.id}
              className="bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl p-4"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{product?.name ?? order.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Buyer: {buyer?.email ?? "—"}
                  </p>
                  {orderAny.phone && (
                    <p className="text-sm text-gray-500">
                      Phone: {orderAny.phone}
                    </p>
                  )}
                  {orderAny.shippingAddress && (
                    <p className="text-sm text-gray-500">
                      Address: {orderAny.shippingAddress}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <p className="font-bold">
                    ${typeof product?.price === "number" ? product.price.toFixed(2) : "—"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                    <Select
                      value={status}
                      onValueChange={(value) =>
                        updateStatus.mutate({
                          orderId: order.id,
                          status: value as OrderStatus,
                        })
                      }
                    >
                      <SelectTrigger className="h-7 text-xs w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
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
