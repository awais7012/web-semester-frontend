"use client";

import Image from "next/image";
import { toast } from "sonner";
import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";

export const ProductsView = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const products = useQuery(trpc.vendor.getProducts.queryOptions({}));

  const toggleArchive = useMutation(
    trpc.vendor.toggleArchive.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.vendor.getProducts.queryFilter());
        queryClient.invalidateQueries(trpc.vendor.getStats.queryFilter());
        toast.success("Product updated");
      },
      onError: (e) => toast.error(e.message),
    })
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-gray-500 mt-1">Manage your product listings.</p>
        </div>
        <a
          href="/admin/collections/products/create"
          className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-pink-400 hover:text-black transition-colors"
        >
          + New product
        </a>
      </div>

      {products.isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 animate-pulse rounded-xl" />
          ))}
        </div>
      )}

      {!products.isLoading && products.data?.docs.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-medium">No products yet.</p>
          <p className="text-sm mt-1">Create your first product to start selling.</p>
        </div>
      )}

      <div className="space-y-3">
        {products.data?.docs.map((product) => (
          <div
            key={product.id}
            className="bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl p-4 flex items-center gap-4"
          >
            <div className="relative size-14 rounded-lg overflow-hidden border bg-gray-100 shrink-0">
              <Image
                src={(product.image as { url?: string } | null)?.url ?? "/placeholder.png"}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate ${product.isArchived ? "line-through text-gray-400" : ""}`}>
                {product.name}
              </p>
              <p className="text-sm text-gray-500">${product.price.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {product.isArchived ? (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">Archived</span>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toggleArchive.mutate({ productId: product.id, archived: !product.isArchived })
                }
                disabled={toggleArchive.isPending}
                title={product.isArchived ? "Unarchive" : "Archive"}
              >
                {product.isArchived ? (
                  <ArchiveRestoreIcon className="size-4" />
                ) : (
                  <ArchiveIcon className="size-4" />
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
