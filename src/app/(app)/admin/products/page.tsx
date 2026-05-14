"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Package, Archive, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { productsApi } from "@/lib/api-client";
import { AdminTopNavbar } from "@/components/admin/top-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  price: number;
  tenant_name: string;
  category_name: string | null;
  image_url: string | null;
  is_archived: boolean;
  is_private: boolean;
  avg_rating: number;
  review_count: number;
  created_at: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [archived, setArchived] = useState("");
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const limit = 20;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit };
    if (search)  params.search = search;
    // For admin, pass archived filter via query — backend handles it
    const res = await productsApi.list(params);
    if (res.success && res.data) {
      let data = res.data as Product[];
      if (archived === "true")  data = data.filter((p) => p.is_archived);
      if (archived === "false") data = data.filter((p) => !p.is_archived);
      setProducts(data);
      setTotal(res.pagination?.total ?? 0);
    }
    setLoading(false);
  }, [page, search, archived]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function toggleArchive(id: number) {
    const res = await productsApi.archive(id);
    if (res.success) {
      toast.success("Archive status updated");
      fetchProducts();
    } else {
      toast.error("Failed to update archive status");
    }
  }

  async function deleteProduct(id: number) {
    if (!confirm("Delete this product permanently? This cannot be undone.")) return;
    const res = await productsApi.delete(id);
    if (res.success) {
      toast.success("Product deleted");
      fetchProducts();
    } else {
      toast.error("Failed to delete product");
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col min-h-full">
      <AdminTopNavbar title="Products" />

      <div className="flex-1 p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Search products..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm px-3 text-zinc-700 dark:text-zinc-300"
            value={archived}
            onChange={(e) => { setArchived(e.target.value); setPage(1); }}
          >
            <option value="">All Products</option>
            <option value="false">Active Only</option>
            <option value="true">Archived Only</option>
          </select>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{total} product{total !== 1 ? "s" : ""}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  {["Product", "Price", "Tenant", "Category", "Rating", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-5 py-3">
                          <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-zinc-400">No products found</td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className={cn(
                      "border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors",
                      p.is_archived && "opacity-60"
                    )}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <Package className="w-4 h-4 text-zinc-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-zinc-900 dark:text-zinc-100 max-w-48 truncate">{p.name}</div>
                            {p.is_private && (
                              <span className="text-xs text-zinc-400">Private</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                        ${Number(p.price).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300 text-xs">{p.tenant_name}</td>
                      <td className="px-5 py-3 text-zinc-500 dark:text-zinc-400 text-xs">
                        {p.category_name ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-xs">
                        <span className="text-amber-500">★</span>{" "}
                        <span className="text-zinc-600 dark:text-zinc-300">
                          {Number(p.avg_rating).toFixed(1)} ({p.review_count})
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          p.is_archived
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                            : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        )}>
                          {p.is_archived ? "Archived" : "Active"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => toggleArchive(p.id)}
                            title={p.is_archived ? "Unarchive" : "Archive"}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-500 hover:text-red-600"
                            onClick={() => deleteProduct(p.id)}
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-400">Page {page} of {totalPages}</p>
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
