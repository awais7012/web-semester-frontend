"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Trash2, Edit, UserCheck, UserX, ChevronLeft, ChevronRight } from "lucide-react";
import { adminApi } from "@/lib/api-client";
import { AdminTopNavbar } from "@/components/admin/top-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "vendor" | "user";
  status: "active" | "pending" | "blocked";
  email_verified: boolean;
  tenant_name: string | null;
  created_at: string;
}

const ROLE_STYLES = {
  admin:  "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  vendor: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  user:   "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300",
};

const STATUS_STYLES = {
  active:  "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  blocked: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

export default function UsersPage() {
  const [users, setUsers]         = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [roleFilter, setRole]     = useState("");
  const [statusFilter, setStatus] = useState("");
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit };
    if (search)       params.search = search;
    if (roleFilter)   params.role   = roleFilter;
    if (statusFilter) params.status = statusFilter;

    const res = await adminApi.users(params);
    if (res.success && res.data) {
      setUsers(res.data as User[]);
      setTotal(res.pagination?.total ?? 0);
    }
    setLoading(false);
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function updateUser(id: number, body: { role?: string; status?: string }) {
    const res = await adminApi.updateUserRole(id, body);
    if (res.success) {
      toast.success("User updated");
      fetchUsers();
    } else {
      toast.error(res.error ?? "Failed to update user");
    }
  }

  async function deleteUser(id: number) {
    if (!confirm("Delete this user permanently?")) return;
    const res = await adminApi.deleteUser(id);
    if (res.success) {
      toast.success("User deleted");
      fetchUsers();
    } else {
      toast.error(res.error ?? "Failed to delete user");
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col min-h-full">
      <AdminTopNavbar title="Users" />

      <div className="flex-1 p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Search by email or username..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm px-3 text-zinc-700 dark:text-zinc-300"
            value={roleFilter}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="vendor">Vendor</option>
            <option value="user">User</option>
          </select>
          <select
            className="h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm px-3 text-zinc-700 dark:text-zinc-300"
            value={statusFilter}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {total} user{total !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  {["User", "Role", "Status", "Tenant", "Joined", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-zinc-400">No users found</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{user.username}</div>
                        <div className="text-xs text-zinc-400">{user.email}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", ROLE_STYLES[user.role])}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", STATUS_STYLES[user.status])}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300 text-xs">
                        {user.role === "admin" ? "Platform" : (user.tenant_name ?? "—")}
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-400 whitespace-nowrap">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {user.status === "blocked" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-emerald-600 hover:text-emerald-700"
                              onClick={() => updateUser(user.id, { status: "active" })}
                              title="Unblock"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-amber-600 hover:text-amber-700"
                              onClick={() => updateUser(user.id, { status: "blocked" })}
                              title="Block"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {user.status === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-blue-600 hover:text-blue-700 text-xs"
                              onClick={() => updateUser(user.id, { status: "active" })}
                            >
                              <Edit className="w-3.5 h-3.5 mr-1" /> Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-500 hover:text-red-600"
                            onClick={() => deleteUser(user.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
