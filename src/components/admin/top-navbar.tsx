"use client";

import { Bell, Search, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStoredUser } from "@/lib/api-client";

interface Props {
  title: string;
}

export function AdminTopNavbar({ title }: Props) {
  const { theme, setTheme } = useTheme();
  const user = getStoredUser();

  return (
    <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center px-6 gap-4 shrink-0">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex-none">
        {title}
      </h1>

      <div className="relative flex-1 max-w-sm ml-4 hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          placeholder="Search..."
          className="pl-9 h-8 bg-zinc-100 dark:bg-zinc-800 border-none focus-visible:ring-1"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>

        <Button variant="ghost" size="icon" className="w-8 h-8 relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-violet-600 rounded-full" />
        </Button>

        <div className="flex items-center gap-2 ml-1 pl-3 border-l border-zinc-200 dark:border-zinc-700">
          <Avatar className="w-7 h-7">
            <AvatarFallback className="text-xs bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300">
              {user?.username?.slice(0, 2).toUpperCase() ?? "AD"}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold leading-none text-zinc-900 dark:text-zinc-100">
              {user?.username ?? "Admin"}
            </p>
            <p className="text-xs text-zinc-400 leading-none mt-0.5">{user?.email ?? ""}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
