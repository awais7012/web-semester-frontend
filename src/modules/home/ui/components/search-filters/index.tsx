"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { categoriesApi, type Category } from "@/lib/api-client";
import { useProductFilters } from "@/modules/products/hooks/use-product-filters";
import { DEFAULT_BG_COLOR } from "../../../constants";

import { Categories } from "./categories";
import { SearchInput } from "./search-input";
import { BreadcrumbNavigation } from "./breadcrumb-navigation";

export const SearchFilters = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useProductFilters();

  const params = useParams();
  const categoryParam = params.category as string | undefined;
  const activeCategory = categoryParam || "all";

  useEffect(() => {
    categoriesApi.list().then((res) => {
      if (res.success && res.data) setCategories(res.data);
    });
  }, []);

  const activeCategoryData = categories.find((c) => c.slug === activeCategory);
  const activeCategoryColor = activeCategoryData?.color || DEFAULT_BG_COLOR;
  const activeCategoryName = activeCategoryData?.name || null;

  const activeSubcategory = params.subcategory as string | undefined;
  const activeSubcategoryName =
    activeCategoryData?.subcategories?.find((s) => s.slug === activeSubcategory)?.name || null;

  return (
    <div
      className="px-4 lg:px-12 py-8 border-b flex flex-col gap-4 w-full"
      style={{ backgroundColor: activeCategoryColor }}
    >
      <SearchInput
        defaultValue={filters.search}
        onChange={(value) => setFilters({ search: value })}
      />
      <div className="hidden lg:block">
        <Categories data={categories} />
      </div>
      <BreadcrumbNavigation
        activeCategory={activeCategory}
        activeCategoryName={activeCategoryName}
        activeSubcategoryName={activeSubcategoryName}
      />
    </div>
  );
};

export const SearchFiltersSkeleton = () => {
  return (
    <div className="px-4 lg:px-12 py-8 border-b flex flex-col gap-4 w-full" style={{ backgroundColor: "#F5F5F5" }}>
      <SearchInput disabled />
      <div className="hidden lg:block">
        <div className="h-11" />
      </div>
    </div>
  );
};
