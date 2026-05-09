"use client";

import { PackageIcon, ShoppingCartIcon, DollarSignIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";

const StatCard = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) => (
  <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl p-6 flex items-center gap-4">
    <div className="bg-[#F4F4F0] rounded-lg p-3">
      <Icon className="size-6" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

export const DashboardView = () => {
  const trpc = useTRPC();
  const stats = useQuery(trpc.vendor.getStats.queryOptions());
  const session = useQuery(trpc.auth.session.queryOptions());

  const username = (session.data?.user as { username?: string })?.username;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back{username ? `, ${username}` : ""}!</h1>
        <p className="text-gray-500 mt-1">Here's how your store is doing.</p>
      </div>

      {stats.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-200 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard
            label="Total Products"
            value={stats.data?.productCount ?? 0}
            icon={PackageIcon}
          />
          <StatCard
            label="Total Sales"
            value={stats.data?.orderCount ?? 0}
            icon={ShoppingCartIcon}
          />
          <StatCard
            label="Total Revenue"
            value={`$${(stats.data?.totalRevenue ?? 0).toFixed(2)}`}
            icon={DollarSignIcon}
          />
        </div>
      )}

      <div className="mt-10 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-2">Quick links</h2>
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          <li>Go to <a href="/vendor/products" className="underline font-medium text-black">Products</a> to manage your listings</li>
          <li>Go to <a href="/vendor/orders" className="underline font-medium text-black">Orders</a> to see your sales</li>
          <li>Go to <a href="/vendor/settings" className="underline font-medium text-black">Settings</a> to verify your Stripe account</li>
        </ul>
      </div>
    </div>
  );
};
