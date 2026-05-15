"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";

import { libraryApi, type LibraryProduct } from "@/lib/api-client";
import { DEFAULT_LIMIT } from "@/constants";
import { Button } from "@/components/ui/button";

import { ProductCard, ProductCardSkeleton } from "./product-card";

export const ProductList = () => {
  const [products, setProducts] = useState<LibraryProduct[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  useEffect(() => {
    libraryApi.list({ page: 1, limit: DEFAULT_LIMIT }).then((res) => {
      if (res.success && res.data) {
        setProducts(res.data);
        setHasMore((res.pagination?.page ?? 1) < (res.pagination?.totalPages ?? 1));
      }
      setIsLoading(false);
    });
  }, []);

  const loadMore = async () => {
    setIsFetchingMore(true);
    const nextPage = page + 1;
    const res = await libraryApi.list({ page: nextPage, limit: DEFAULT_LIMIT });
    if (res.success && res.data) {
      setProducts((prev) => [...prev, ...res.data!]);
      setPage(nextPage);
      setHasMore(nextPage < (res.pagination?.totalPages ?? 1));
    }
    setIsFetchingMore(false);
  };

  if (isLoading) {
    return <ProductListSkeleton />;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-24 text-zinc-400">
        <ShoppingBagIcon className="size-14 mx-auto mb-4 opacity-20" />
        <p className="text-lg font-semibold text-zinc-600">No purchases yet</p>
        <p className="text-sm mt-1">Products you buy will appear here.</p>
        <Link href="/" className="inline-block mt-6 bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-pink-400 hover:text-black transition-colors text-sm">
          Browse marketplace
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard
            key={`${product.order_id}-${product.id}`}
            id={String(product.id)}
            name={product.name}
            imageUrl={product.image_url}
            tenantSlug={product.tenant_slug}
            tenantImageUrl={null}
            reviewRating={product.avg_rating}
            reviewCount={product.review_count}
          />
        ))}
      </div>
      <div className="flex justify-center pt-8">
        {hasMore && (
          <Button
            disabled={isFetchingMore}
            onClick={loadMore}
            className="font-medium disabled:opacity-50 text-base bg-white"
            variant="elevated"
          >
            Load more
          </Button>
        )}
      </div>
    </>
  );
};

export const ProductListSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {Array.from({ length: DEFAULT_LIMIT }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
};
