"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOutIcon, MenuIcon, ShoppingCartIcon } from "lucide-react";
import { Poppins } from "next/font/google";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/modules/checkout/store/use-cart-store";
import { generateTenantURL } from "@/lib/utils";

import { NavbarSidebar } from "./navbar-sidebar";

const poppins = Poppins({ subsets: ["latin"], weight: ["700"] });

const navbarItems = [
  { href: "/", children: "Home" },
];

function CartNavButton() {
  const tenantCarts = useCartStore((s) => s.tenantCarts);
  const entries = Object.entries(tenantCarts).filter(([, c]) => c.productIds.length > 0);
  const totalItems = entries.reduce((sum, [, c]) => sum + c.productIds.length, 0);

  if (totalItems === 0) return null;

  const firstSlug = entries[0]?.[0];
  const href = firstSlug ? `${generateTenantURL(firstSlug)}/checkout` : "/";

  return (
    <Link
      href={href}
      className="relative flex items-center gap-1.5 border-l border-t-0 border-b-0 border-r-0 px-5 h-full bg-white hover:bg-pink-400 transition-colors text-base font-medium"
    >
      <ShoppingCartIcon className="size-5" />
      <span className="absolute top-3 right-2 bg-black text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
        {totalItems}
      </span>
    </Link>
  );
}

export const Navbar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const isAdmin  = user?.role === "admin";
  const isVendor = user?.role === "vendor";

  const dashboardHref  = isAdmin ? "/admin" : isVendor ? "/vendor/dashboard" : "/library";
  const dashboardLabel = isAdmin ? "Admin panel" : isVendor ? "Dashboard" : "Library";

  return (
    <nav className="h-20 flex border-b justify-between font-medium bg-white">
      <Link href="/" className="pl-6 flex items-center">
        <span className={cn("text-5xl font-semibold", poppins.className)}>funroad</span>
      </Link>

      <NavbarSidebar
        items={navbarItems}
        open={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
      />

      {user ? (
        <div className="hidden lg:flex">
          <CartNavButton />
          <Button
            asChild
            variant="secondary"
            className="border-l border-t-0 border-b-0 border-r-0 px-8 h-full rounded-none bg-white hover:bg-pink-400 transition-colors text-lg"
          >
            <Link href={dashboardHref}>{dashboardLabel}</Link>
          </Button>
          <Button
            variant="secondary"
            onClick={logout}
            className="border-l border-t-0 border-b-0 border-r-0 px-6 h-full rounded-none bg-white hover:bg-red-100 hover:text-red-700 transition-colors"
            title="Sign out"
          >
            <LogOutIcon className="size-5" />
          </Button>
        </div>
      ) : (
        <div className="hidden lg:flex">
          <Button
            asChild
            variant="secondary"
            className="border-l border-t-0 border-b-0 border-r-0 px-12 h-full rounded-none bg-white hover:bg-pink-400 transition-colors text-lg"
          >
            <Link prefetch href="/sign-in">Log in</Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            className="border-l border-t-0 border-b-0 border-r-0 px-8 h-full rounded-none bg-white hover:bg-pink-400 transition-colors text-lg"
          >
            <Link prefetch href="/sign-up">Sign up</Link>
          </Button>
          <Button
            asChild
            className="border-l border-t-0 border-b-0 border-r-0 px-8 h-full rounded-none bg-black text-white hover:bg-pink-400 hover:text-black transition-colors text-lg"
          >
            <Link prefetch href="/sign-up?role=vendor">Start selling</Link>
          </Button>
        </div>
      )}

      <div className="flex lg:hidden items-center justify-center">
        <Button
          variant="ghost"
          className="size-12 border-transparent bg-white"
          onClick={() => setIsSidebarOpen(true)}
        >
          <MenuIcon />
        </Button>
      </div>
    </nav>
  );
};
