"use client";

import { Package, Star } from "lucide-react";
import type { TopProduct } from "@/lib/api-client";

interface Props {
  products: TopProduct[];
  loading?: boolean;
}

export function TopProductsList({ products, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5">
        <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse mb-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Top Products</h3>
        <a href="/admin/products" className="text-xs text-violet-600 dark:text-violet-400 hover:underline">
          View all →
        </a>
      </div>
      <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
        {products.length === 0 ? (
          <div className="px-5 py-10 text-center text-zinc-400 text-sm">No products yet</div>
        ) : (
          products.map((product, index) => (
            <div
              key={product.id}
              className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <span className="text-sm font-bold text-zinc-400 w-5">{index + 1}</span>
              <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-5 h-5 text-zinc-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                  {product.name}
                </p>
                <p className="text-xs text-zinc-400">{product.tenant_name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  Rs {Number(product.total_revenue).toLocaleString()}
                </p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs text-zinc-500">
                    {Number(product.avg_rating).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
