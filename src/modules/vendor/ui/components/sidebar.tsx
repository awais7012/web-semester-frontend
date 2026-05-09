"use client";

import Link from "next/link";
import { Poppins } from "next/font/google";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboardIcon,
  PackageIcon,
  ShoppingCartIcon,
  SettingsIcon,
  StoreIcon,
  LogOutIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const poppins = Poppins({ subsets: ["latin"], weight: ["700"] });

const navItems = [
  { href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/vendor/products", label: "Products", icon: PackageIcon },
  { href: "/vendor/orders", label: "Orders", icon: ShoppingCartIcon },
  { href: "/vendor/settings", label: "Settings", icon: SettingsIcon },
];

export const VendorSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const session = useQuery(trpc.auth.session.queryOptions());
  const store = useQuery(trpc.vendor.getStore.queryOptions());

  const logout = useMutation({
    mutationFn: async () => {
      await fetch("/api/users/logout", { method: "POST" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(trpc.auth.session.queryFilter());
      router.push("/sign-in");
    },
  });

  return (
    <aside className="w-64 min-h-screen bg-white border-r flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b">
        <Link href="/">
          <span className={cn("text-2xl font-semibold", poppins.className)}>
            funroad
          </span>
        </Link>
        <p className="text-xs text-gray-500 mt-1">Vendor Dashboard</p>
      </div>

      {/* Store info */}
      <div className="p-4 border-b bg-[#F4F4F0]">
        <div className="flex items-center gap-2">
          <StoreIcon className="size-4 text-gray-500" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">
              {store.data?.tenant?.name ?? session.data?.user?.email ?? "My Store"}
            </p>
            <p className="text-xs text-gray-500 truncate">
              @{store.data?.username ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-4 flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-black text-white"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom links */}
      <div className="p-4 border-t flex flex-col gap-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <StoreIcon className="size-4" />
          View Marketplace
        </Link>
        <button
          onClick={() => logout.mutate()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left"
        >
          <LogOutIcon className="size-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
};
