"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  Building2,
  BarChart3,
  Star,
  Menu,
  X,
  Zap,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearToken } from "@/lib/api-client";

const navItems = [
  { href: "/admin",           label: "Dashboard",  icon: LayoutDashboard },
  { href: "/admin/users",     label: "Users",      icon: Users },
  { href: "/admin/products",  label: "Products",   icon: Package },
  { href: "/admin/orders",    label: "Orders",     icon: ShoppingCart },
  { href: "/admin/tenants",   label: "Tenants",    icon: Building2 },
  { href: "/admin/analytics", label: "Analytics",  icon: BarChart3 },
  { href: "/admin/reviews",   label: "Reviews",    icon: Star },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function handleLogout() {
    clearToken();
    window.location.href = "/sign-in";
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-zinc-900 text-zinc-100 transition-all duration-300 border-r border-zinc-800",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-zinc-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-violet-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">Admin Panel</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors ml-auto"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-violet-600 text-white"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-colors"
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
