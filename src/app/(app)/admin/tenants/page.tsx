"use client";

import { useEffect, useState, useCallback } from "react";
import { Building2, Plus, Trash2, Edit, DollarSign, Package, ShoppingCart } from "lucide-react";
import { adminApi } from "@/lib/api-client";
import { AdminTopNavbar } from "@/components/admin/top-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Tenant {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  user_count: number;
  product_count: number;
  order_count: number;
  total_revenue: number;
  created_at: string;
}

export default function TenantsPage() {
  const [tenants, setTenants]   = useState<Tenant[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: "", slug: "", description: "" });
  const [saving, setSaving]     = useState(false);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    const res = await adminApi.users({ limit: 100 }); // re-use but fetch tenants
    // Actually call tenants API directly
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/tenants?limit=100`, {
      credentials: "include",
    });
    const json = await r.json();
    if (json.success) setTenants(json.data);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  async function createTenant() {
    if (!form.name || !form.slug) {
      toast.error("Name and slug are required");
      return;
    }
    setSaving(true);
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/tenants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    const json = await r.json();
    setSaving(false);
    if (json.success) {
      toast.success("Tenant created");
      setShowForm(false);
      setForm({ name: "", slug: "", description: "" });
      fetchTenants();
    } else {
      toast.error(json.error ?? "Failed to create tenant");
    }
  }

  async function deleteTenant(id: number, name: string) {
    if (!confirm(`Delete tenant "${name}" and ALL associated data? This cannot be undone.`)) return;
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api"}/tenants/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await r.json();
    if (json.success) {
      toast.success("Tenant deleted");
      fetchTenants();
    } else {
      toast.error(json.error ?? "Failed to delete tenant");
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <AdminTopNavbar title="Tenants" />

      <div className="flex-1 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{tenants.length} tenant{tenants.length !== 1 ? "s" : ""}</p>
          <Button size="sm" onClick={() => setShowForm((s) => !s)}>
            <Plus className="w-4 h-4 mr-1" /> New Tenant
          </Button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Create Tenant</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Tenant name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              <Input
                placeholder="slug (lowercase, hyphens)"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
              />
              <Input
                placeholder="Description (optional)"
                className="sm:col-span-2"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={createTenant} disabled={saving}>
                {saving ? "Saving..." : "Create"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-40 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">No tenants yet</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((tenant) => (
              <div
                key={tenant.id}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      {tenant.logo_url ? (
                        <img src={tenant.logo_url} alt={tenant.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Building2 className="w-5 h-5 text-violet-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{tenant.name}</p>
                      <p className="text-xs text-zinc-400 font-mono">{tenant.slug}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    {tenant.id !== 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                        onClick={() => deleteTenant(tenant.id, tenant.name)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-violet-600 dark:text-violet-400 mb-0.5">
                      <Package className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{tenant.product_count}</p>
                    <p className="text-xs text-zinc-400">Products</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-blue-500 mb-0.5">
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{tenant.order_count}</p>
                    <p className="text-xs text-zinc-400">Orders</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-500 mb-0.5">
                      <DollarSign className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      Rs {Number(tenant.total_revenue).toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-400">Revenue</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
