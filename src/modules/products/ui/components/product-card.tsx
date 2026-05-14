import React from "react";
import Link from "next/link";
import Image from "next/image";
import { StarIcon, ShoppingBagIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { formatCurrency, generateTenantURL } from "@/lib/utils";

interface ProductCardProps {
  id: string;
  name: string;
  imageUrl?: string | null;
  tenantSlug: string;
  tenantName?: string;
  tenantImageUrl?: string | null;
  reviewRating: number;
  reviewCount: number;
  price: number;
}

export const ProductCard = ({
  id,
  name,
  imageUrl,
  tenantSlug,
  tenantName,
  reviewRating,
  reviewCount,
  price,
}: ProductCardProps) => {
  const router = useRouter();

  return (
    <Link href={`${generateTenantURL(tenantSlug)}/products/${id}`} className="group block h-full">
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden h-full flex flex-col transition-all duration-200 group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] group-hover:-translate-y-1 group-hover:border-zinc-200">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-50">
          <Image
            alt={name}
            fill
            src={imageUrl || "/placeholder.png"}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {!imageUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ShoppingBagIcon className="w-12 h-12 text-zinc-200" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          <h2 className="font-semibold text-zinc-900 line-clamp-2 leading-snug text-sm">{name}</h2>

          <div
            className="flex items-center gap-1.5 cursor-pointer group/seller"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(generateTenantURL(tenantSlug)); }}
          >
            <div className="w-4 h-4 rounded-full bg-zinc-100 border border-zinc-200 overflow-hidden shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-pink-300 to-violet-400" />
            </div>
            <p className="text-xs text-zinc-500 group-hover/seller:text-black transition-colors font-medium truncate">
              {tenantName ?? tenantSlug}
            </p>
          </div>

          {reviewCount > 0 && (
            <div className="flex items-center gap-1">
              <StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-zinc-700">{Number(reviewRating).toFixed(1)}</span>
              <span className="text-xs text-zinc-400">({reviewCount})</span>
            </div>
          )}

          <div className="mt-auto pt-2 flex items-center justify-between">
            <span className="inline-block bg-pink-400 text-black text-xs font-bold px-3 py-1 rounded-full">
              {formatCurrency(price)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export const ProductCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden animate-pulse">
    <div className="aspect-[4/3] bg-zinc-100" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-zinc-100 rounded w-3/4" />
      <div className="h-3 bg-zinc-100 rounded w-1/2" />
      <div className="h-5 bg-zinc-100 rounded w-1/3 mt-2" />
    </div>
  </div>
);
