"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PackageIcon, ShoppingCartIcon, TrendingUpIcon, ArrowRightIcon, StarIcon, Settings2Icon } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { vendorApi, type VendorStats } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";

export const DashboardView = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    vendorApi.stats().then((res) => {
      if (res.success && res.data) setStats(res.data);
      setIsLoading(false);
    });
  }, []);

  const cards = [
    {
      label: "Total Products",
      value: isLoading ? "—" : String(stats?.product_count ?? 0),
      icon: PackageIcon,
      color: "bg-violet-50 text-violet-600",
      href: "/vendor/products",
    },
    {
      label: "Total Orders",
      value: isLoading ? "—" : String(stats?.order_count ?? 0),
      icon: ShoppingCartIcon,
      color: "bg-blue-50 text-blue-600",
      href: "/vendor/orders",
    },
    {
      label: "Pending Orders",
      value: isLoading ? "—" : String(stats?.pending_orders ?? 0),
      icon: TrendingUpIcon,
      color: "bg-amber-50 text-amber-600",
      href: "/vendor/orders",
    },
    {
      label: "Total Revenue",
      value: isLoading ? "—" : formatCurrency(stats?.total_revenue ?? 0),
      icon: TrendingUpIcon,
      color: "bg-emerald-50 text-emerald-600",
      href: "/vendor/orders",
    },
  ];

  const quickLinks = [
    { href: "/vendor/products", label: "Manage Products", icon: PackageIcon, desc: "Add, edit, or archive your listings" },
    { href: "/vendor/orders", label: "View Orders", icon: ShoppingCartIcon, desc: "Track and update order status" },
    { href: "/vendor/reviews", label: "Reviews", icon: StarIcon, desc: "Reply to customer feedback" },
    { href: "/vendor/settings", label: "Store Settings", icon: Settings2Icon, desc: "Update store info and connect Stripe" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900">
          Welcome back{user?.username ? `, ${user.username}` : ""}!
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">Here&apos;s how your store is doing today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group bg-white rounded-2xl border border-zinc-100 p-5 hover:shadow-md hover:border-zinc-200 transition-all"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-zinc-900">{card.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-4 bg-white rounded-2xl border border-zinc-100 p-4 hover:shadow-md hover:border-zinc-200 transition-all"
            >
              <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-black group-hover:text-white transition-colors">
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-900 text-sm">{item.label}</p>
                <p className="text-xs text-zinc-400 truncate">{item.desc}</p>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-zinc-300 group-hover:text-zinc-600 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
