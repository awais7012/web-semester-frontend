"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOutIcon, MenuIcon } from "lucide-react";
import { Poppins } from "next/font/google";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";

import { NavbarSidebar } from "./navbar-sidebar";

const poppins = Poppins({ subsets: ["latin"], weight: ["700"] });

interface NavbarItemProps {
  href: string;
  children: React.ReactNode;
  isActive?: boolean;
}

const NavbarItem = ({ href, children, isActive }: NavbarItemProps) => (
  <Button
    asChild
    variant="outline"
    className={cn(
      "bg-transparent hover:bg-transparent rounded-full hover:border-primary border-transparent px-3.5 text-lg",
      isActive && "bg-black text-white hover:bg-black hover:text-white"
    )}
  >
    <Link href={href}>{children}</Link>
  </Button>
);

const navbarItems = [
  { href: "/", children: "Home" },
  { href: "/about", children: "About" },
  { href: "/features", children: "Features" },
  { href: "/pricing", children: "Pricing" },
  { href: "/contact", children: "Contact" },
];

export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const session = useQuery(trpc.auth.session.queryOptions());

  const logout = useMutation({
    mutationFn: async () => {
      await fetch("/api/users/logout", { method: "POST" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(trpc.auth.session.queryFilter());
      router.push("/");
    },
  });

  const user = session.data?.user;
  const roles: string[] = (user as { roles?: string[] })?.roles ?? [];
  const isAdmin = roles.includes("admin");
  const isVendor = roles.includes("vendor");

  // Determine dashboard link based on role
  const dashboardHref = isAdmin
    ? "/admin"
    : isVendor
    ? "/vendor/dashboard"
    : "/library";

  const dashboardLabel = isAdmin
    ? "Admin panel"
    : isVendor
    ? "Dashboard"
    : "Library";

  return (
    <nav className="h-20 flex border-b justify-between font-medium bg-white">
      <Link href="/" className="pl-6 flex items-center">
        <span className={cn("text-5xl font-semibold", poppins.className)}>
          funroad
        </span>
      </Link>

      <NavbarSidebar
        items={navbarItems}
        open={isSidebarOpen}
        onOpenChange={setIsSidebarOpen}
      />

      <div className="items-center gap-4 hidden lg:flex">
        {navbarItems.map((item) => (
          <NavbarItem
            key={item.href}
            href={item.href}
            isActive={pathname === item.href}
          >
            {item.children}
          </NavbarItem>
        ))}
      </div>

      {user ? (
        <div className="hidden lg:flex">
          <Button
            asChild
            variant="secondary"
            className="border-l border-t-0 border-b-0 border-r-0 px-8 h-full rounded-none bg-white hover:bg-pink-400 transition-colors text-lg"
          >
            <Link href={dashboardHref}>{dashboardLabel}</Link>
          </Button>
          <Button
            variant="secondary"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
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
