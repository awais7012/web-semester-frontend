"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { useProductFilters } from "../../hooks/use-product-filters"

const SORT_OPTIONS = [
  { value: "curated",   label: "Curated" },
  { value: "newest",    label: "Newest" },
  { value: "price_asc", label: "Price: Low" },
  { value: "price_desc",label: "Price: High" },
] as const;

export const ProductSort = () => {
  const [filters, setFilters] = useProductFilters();

  return (
    <div className="flex items-center gap-2">
      {SORT_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          size="sm"
          className={cn(
            "rounded-full bg-white hover:bg-white",
            filters.sort !== opt.value &&
              "bg-transparent border-transparent hover:border-border hover:bg-transparent"
          )}
          variant="secondary"
          onClick={() => setFilters({ sort: opt.value })}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
};
