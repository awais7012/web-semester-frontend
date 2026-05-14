"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Poppins } from "next/font/google";
import { usePathname } from "next/navigation";
import {
  LayoutDashboardIcon,
  PackageIcon,
  ShoppingCartIcon,
  SettingsIcon,
  StoreIcon,
  LogOutIcon,
  MessageSquareIcon,
  BarChart2Icon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { vendorApi, type VendorStore } from "@/lib/api-client";

const poppins = Poppins({ subsets: ["latin"], weight: ["700"] });

const navItems = [
  { href: "/vendor/dashboard",  label: "Dashboard",  icon: LayoutDashboardIcon },
  { href: "/vendor/products",   label: "Products",   icon: PackageIcon },
  { href: "/vendor/orders",     label: "Orders",     icon: ShoppingCartIcon },
  { href: "/vendor/analytics",  label: "Analytics",  icon: BarChart2Icon },
  { href: "/vendor/reviews",    label: "Reviews",    icon: MessageSquareIcon },
  { href: "/vendor/settings",   label: "Settings",   icon: SettingsIcon },
];

export const VendorSidebar = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [store, setStore] = useState<VendorStore | null>(null);

  useEffect(() => {
    vendorApi.store().then((res) => {
      if (res.success && res.data) setStore(res.data);
    });
  }, []);

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-zinc-100 flex flex-col">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-zinc-100">
        <Link href="/" className="flex items-center gap-2 group">
          <span className={cn("text-xl font-bold tracking-tight", poppins.className)}>funroad</span>
          <span className="text-[10px] bg-violet-100 text-violet-600 font-semibold px-2 py-0.5 rounded-full">vendor</span>
        </Link>
      </div>

      {/* Store card */}
      <div className="mx-4 mt-4 mb-2 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 p-3 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shrink-0">
          <StoreIcon className="size-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-800 truncate">
            {store?.tenant?.name ?? user?.email ?? "My Store"}
          </p>
          <p className="text-xs text-zinc-400 truncate">@{store?.username ?? user?.username ?? "—"}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-black text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <Icon className={cn("size-4 shrink-0", active ? "text-white" : "text-zinc-400")} />
              {label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-pink-400" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 pt-2 border-t border-zinc-100 flex flex-col gap-0.5 mt-auto">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
        >
          <StoreIcon className="size-4 text-zinc-400 shrink-0" />
          View Marketplace
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-700 w-full text-left transition-colors"
        >
          <LogOutIcon className="size-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
};
