import React from "react";
import Link from "next/link";
import Image from "next/image";
import { StarIcon, PackageIcon } from "lucide-react";

interface ProductCardProps {
  id: string;
  name: string;
  imageUrl?: string | null;
  tenantSlug: string;
  tenantImageUrl?: string | null;
  reviewRating: number;
  reviewCount: number;
}

export const ProductCard = ({
  id,
  name,
  imageUrl,
  tenantSlug,
  reviewRating,
  reviewCount,
}: ProductCardProps) => {
  return (
    <Link prefetch href={`/library/${id}`} className="group block h-full">
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden h-full flex flex-col transition-all duration-200 group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)] group-hover:-translate-y-1 group-hover:border-zinc-200">
        {/* Thumbnail */}
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-50">
          {imageUrl ? (
            <Image
              alt={name}
              fill
              src={imageUrl}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-100">
              <PackageIcon className="w-12 h-12 text-violet-200" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col gap-2 flex-1">
          <h2 className="font-semibold text-zinc-900 line-clamp-2 leading-snug text-sm">{name}</h2>

          <p className="text-xs text-zinc-400 font-medium truncate">by {tenantSlug}</p>

          <div className="mt-auto flex items-center justify-between pt-2">
            {reviewCount > 0 ? (
              <div className="flex items-center gap-1">
                <StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold text-zinc-700">{Number(reviewRating).toFixed(1)}</span>
                <span className="text-xs text-zinc-400">({reviewCount})</span>
              </div>
            ) : (
              <span className="text-xs text-zinc-300">No reviews yet</span>
            )}
            <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2.5 py-0.5 rounded-full">
              Owned
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
      <div className="h-4 bg-zinc-100 rounded w-1/3 mt-2" />
    </div>
  </div>
);
