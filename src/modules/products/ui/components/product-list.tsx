"use client";

import { useEffect, useState } from "react";
import { SearchXIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { productsApi, type Product } from "@/lib/api-client";
import { DEFAULT_LIMIT } from "@/constants";
import { Button } from "@/components/ui/button";

import { ProductCard, ProductCardSkeleton } from "./product-card";
import { useProductFilters } from "../../hooks/use-product-filters";

interface Props {
  category?: string;
  tenantSlug?: string;
  narrowView?: boolean;
};

export const ProductList = ({ category, tenantSlug, narrowView }: Props) => {
  const [filters] = useProductFilters();
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setPage(1);
    setProducts([]);

    const params: Record<string, string | number> = { limit: DEFAULT_LIMIT, page: 1 };
    if (filters.search)   params.search    = filters.search;
    if (filters.minPrice) params.min_price = filters.minPrice;
    if (filters.maxPrice) params.max_price = filters.maxPrice;
    if (filters.sort)     params.sort      = filters.sort;
    if (category)         params.category  = category;
    if (tenantSlug)       params.tenant    = tenantSlug;

    productsApi.list(params).then((res) => {
      if (res.success && res.data) {
        setProducts(res.data);
        setHasMore((res.pagination?.page ?? 1) < (res.pagination?.totalPages ?? 1));
      }
      setIsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.minPrice, filters.maxPrice, filters.sort, category, tenantSlug]);

  const loadMore = async () => {
    setIsFetchingMore(true);
    const nextPage = page + 1;
    const params: Record<string, string | number> = { limit: DEFAULT_LIMIT, page: nextPage };
    if (filters.search)   params.search    = filters.search;
    if (filters.minPrice) params.min_price = filters.minPrice;
    if (filters.maxPrice) params.max_price = filters.maxPrice;
    if (filters.sort)     params.sort      = filters.sort;
    if (category)         params.category  = category;
    if (tenantSlug)       params.tenant    = tenantSlug;

    const res = await productsApi.list(params);
    if (res.success && res.data) {
      setProducts((prev) => [...prev, ...res.data!]);
      setPage(nextPage);
      setHasMore(nextPage < (res.pagination?.totalPages ?? 1));
    }
    setIsFetchingMore(false);
  };

  if (isLoading) {
    return <ProductListSkeleton narrowView={narrowView} />;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-zinc-400">
        <SearchXIcon className="size-12 mx-auto mb-4 opacity-30" />
        <p className="text-base font-semibold text-zinc-600">No products found</p>
        <p className="text-sm mt-1">Try adjusting your filters or search term.</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4",
        narrowView && "lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3"
      )}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            id={String(product.id)}
            name={product.name}
            imageUrl={product.image_url ?? undefined}
            tenantSlug={product.tenant_slug}
            tenantName={product.tenant_name}
            reviewRating={product.avg_rating}
            reviewCount={product.review_count}
            price={product.price}
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

export const ProductListSkeleton = ({ narrowView }: Props) => {
  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4",
      narrowView && "lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3"
    )}>
      {Array.from({ length: DEFAULT_LIMIT }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
};
