"use client";

import Link from "next/link";
import Image from "next/image";
import { Fragment, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  CheckIcon,
  LinkIcon,
  StarIcon,
  ShieldCheckIcon,
  TagIcon,
  ZoomInIcon,
  CalendarIcon,
  MessageSquareIcon,
  RotateCcwIcon,
  TruckIcon,
  StoreIcon,
  PackageIcon,
} from "lucide-react";

import {
  productsApi,
  reviewsApi,
  type ProductDetail,
  type Review,
  type Product,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { StarRating } from "@/components/star-rating";
import { formatCurrency, generateTenantURL } from "@/lib/utils";
import { ProductCard, ProductCardSkeleton } from "../components/product-card";

const CartButton = dynamic(
  () => import("../components/cart-button").then((mod) => mod.CartButton),
  {
    ssr: false,
    loading: () => (
      <Button disabled className="w-full bg-pink-400 text-black font-semibold h-12 text-base">
        Add to cart
      </Button>
    ),
  }
);

interface ProductViewProps {
  productId: string;
  tenantSlug: string;
}

export const ProductView = ({ productId, tenantSlug }: ProductViewProps) => {
  const [data, setData] = useState<ProductDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      productsApi.get(productId, tenantSlug),
      reviewsApi.list({ product_id: Number(productId), limit: 50 }),
    ]).then(([productRes, reviewsRes]) => {
      if (productRes.success && productRes.data) {
        setData(productRes.data);
        // Load related products from same tenant
        productsApi
          .list({ tenant: productRes.data.tenant_slug, limit: 5 })
          .then((rel) => {
            if (rel.success && rel.data) {
              setRelated(
                (rel.data as Product[]).filter((p) => String(p.id) !== productId).slice(0, 4)
              );
            }
          });
      }
      if (reviewsRes.success && reviewsRes.data) {
        setReviews(reviewsRes.data as Review[]);
      }
      setIsLoading(false);
    });
  }, [productId, tenantSlug]);

  if (isLoading || !data) return <ProductViewSkeleton />;

  // Rating distribution
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    dist[r.rating] = (dist[r.rating] ?? 0) + 1;
  });
  const distPct: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (reviews.length > 0) {
    Object.keys(dist).forEach((k) => {
      distPct[Number(k)] = Math.round(((dist[Number(k)] ?? 0) / reviews.length) * 100);
    });
  }

  const avgRating = Number(data.avg_rating).toFixed(1);
  const tenantUrl = generateTenantURL(tenantSlug);
  const isDescLong = (data.description ?? "").length > 300;
  const displayDesc = isDescLong && !descExpanded
    ? (data.description ?? "").slice(0, 300) + "..."
    : (data.description ?? "");

  const refundLabel =
    data.refund_policy === "no-refunds"
      ? "No refunds"
      : `${data.refund_policy} money‑back guarantee`;

  return (
    <div className="px-4 lg:px-12 py-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={tenantUrl}>{data.tenant_name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {data.category_name && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`${tenantUrl}?category=${data.category_name}`}>
                    {data.category_name}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[200px] truncate">{data.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12">
        {/* ── Image Gallery ── */}
        <div className="space-y-3">
          {/* Main image */}
          <div
            className="relative aspect-square overflow-hidden rounded-sm border bg-white cursor-zoom-in group shadow-sm"
            onClick={() => setLightboxOpen(true)}
          >
            <Image
              src={data.image_url || "/placeholder.png"}
              alt={data.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-end justify-end p-3">
              <div className="bg-white/90 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow">
                <ZoomInIcon className="size-4 text-gray-700" />
              </div>
            </div>
          </div>

          {/* Thumbnail strip (uses same image; placeholder for multi-image support) */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[data.image_url || "/placeholder.png"].map((src, i) => (
              <button
                key={i}
                className="relative size-16 shrink-0 rounded border-2 border-black overflow-hidden"
                onClick={() => setLightboxOpen(true)}
              >
                <Image src={src} alt={`Thumbnail ${i + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* ── Product Info ── */}
        <div className="space-y-5">
          {/* Category + Tags */}
          <div className="flex flex-wrap gap-2">
            {data.category_name && (
              <Badge variant="secondary" className="gap-1">
                <TagIcon className="size-3" />
                {data.category_name}
              </Badge>
            )}
            {(data as ProductDetail & { tags?: Array<{ id: number; name: string }> }).tags?.map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-3xl lg:text-4xl font-bold leading-tight">{data.name}</h1>

          {/* Rating summary */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon
                  key={i}
                  className={`size-5 ${i < Math.round(Number(data.avg_rating)) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                />
              ))}
            </div>
            <span className="font-semibold text-lg">{avgRating}</span>
            <a href="#reviews" className="text-sm text-muted-foreground underline underline-offset-2">
              {data.review_count} {data.review_count === 1 ? "review" : "reviews"}
            </a>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-gray-900">{formatCurrency(data.price)}</span>
          </div>

          <Separator />

          {/* Short description */}
          {data.description ? (
            <div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                {displayDesc}
              </p>
              {isDescLong && (
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="text-sm font-medium underline mt-1 text-gray-900"
                >
                  {descExpanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground italic text-sm">No description provided</p>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              <PackageIcon className="size-4 text-green-600 shrink-0" />
              <span className="text-xs font-medium text-green-800">Instant Access</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
              <ShieldCheckIcon className="size-4 text-blue-600 shrink-0" />
              <span className="text-xs font-medium text-blue-800">Secure Payment</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
              <RotateCcwIcon className="size-4 text-gray-600 shrink-0" />
              <span className="text-xs font-medium text-gray-800 truncate">{refundLabel}</span>
            </div>
          </div>

          <Separator />

          {/* CTA Buttons */}
          <div className="space-y-3">
            <CartButton
              isPurchased={!!data.is_purchased}
              productId={productId}
              tenantSlug={tenantSlug}
            />
            <Button
              variant="elevated"
              className="w-full gap-2 font-medium"
              onClick={() => {
                setIsCopied(true);
                navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied to clipboard");
                setTimeout(() => setIsCopied(false), 2000);
              }}
              disabled={isCopied}
            >
              {isCopied ? <CheckIcon className="size-4" /> : <LinkIcon className="size-4" />}
              {isCopied ? "Copied!" : "Share product"}
            </Button>
          </div>

          {/* Seller card */}
          <div className="border rounded-md p-4 bg-white flex items-center gap-4">
            <div className="size-12 rounded-full bg-gray-100 border flex items-center justify-center shrink-0">
              <StoreIcon className="size-5 text-gray-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Sold by</p>
              <Link
                href={tenantUrl}
                className="font-semibold hover:underline truncate block"
              >
                {data.tenant_name}
              </Link>
            </div>
            <Button asChild variant="outline" size="sm" className="ml-auto shrink-0">
              <Link href={tenantUrl}>Visit Store</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Details Tabs ── */}
      <Tabs defaultValue="description" id="reviews">
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b rounded-none gap-0">
          <TabsTrigger
            value="description"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-medium text-sm"
          >
            Description
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-black data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3 font-medium text-sm"
          >
            Reviews ({data.review_count})
          </TabsTrigger>
        </TabsList>

        {/* Description Tab */}
        <TabsContent value="description" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border rounded-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Product Description</h2>
              {data.description ? (
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {data.description}
                </p>
              ) : (
                <p className="text-muted-foreground italic">No description provided.</p>
              )}
            </div>
            <div className="space-y-4">
              <div className="bg-white border rounded-sm p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <RotateCcwIcon className="size-4" /> Refund Policy
                </h3>
                <p className="text-sm text-gray-600">
                  {data.refund_policy === "no-refunds"
                    ? "This product does not offer refunds."
                    : `This product comes with a ${data.refund_policy} money‑back guarantee. Contact the seller if you are not satisfied.`}
                </p>
              </div>
              <div className="bg-white border rounded-sm p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TruckIcon className="size-4" /> Delivery
                </h3>
                <p className="text-sm text-gray-600">
                  Digital product — access granted instantly after purchase.
                </p>
              </div>
              <div className="bg-white border rounded-sm p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CalendarIcon className="size-4" /> Listed
                </h3>
                <p className="text-sm text-gray-600">
                  {new Date(data.created_at).toLocaleDateString("en-PK", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="mt-6 space-y-6">
          {/* Rating summary */}
          {reviews.length > 0 && (
            <div className="bg-white border rounded-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Average + stars */}
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <span className="text-6xl font-bold">{avgRating}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon
                        key={i}
                        className={`size-6 ${i < Math.round(Number(data.avg_rating)) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                  </p>
                </div>
                {/* Breakdown */}
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => (
                    <div key={stars} className="grid grid-cols-[40px_1fr_40px] items-center gap-3">
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-sm font-medium">{stars}</span>
                        <StarIcon className="size-3.5 fill-amber-400 text-amber-400" />
                      </div>
                      <Progress value={distPct[stars]} className="h-2" />
                      <span className="text-xs text-muted-foreground">{distPct[stars]}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Review cards */}
          {reviews.length === 0 ? (
            <div className="bg-white border rounded-sm p-12 flex flex-col items-center gap-3 text-center">
              <MessageSquareIcon className="size-10 text-gray-300" />
              <p className="font-medium text-gray-600">No reviews yet</p>
              <p className="text-sm text-muted-foreground">
                Be the first to share your experience with this product.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white border rounded-sm p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-gray-100 border flex items-center justify-center shrink-0 font-semibold text-sm uppercase">
                        {review.username?.[0] ?? "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{review.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString("en-PK", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`size-4 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
                  )}
                  {review.vendor_reply && (
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-md p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <StoreIcon className="size-3.5 text-gray-500" />
                        <p className="text-xs font-semibold text-gray-700">
                          {data.tenant_name} (Seller)
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">{review.vendor_reply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Related Products ── */}
      {related.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-5">More from {data.tenant_name}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map((product) => (
              <ProductCard
                key={product.id}
                id={String(product.id)}
                name={product.name}
                imageUrl={product.image_url}
                tenantSlug={product.tenant_slug}
                reviewRating={product.avg_rating}
                reviewCount={product.review_count}
                price={product.price}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Lightbox ── */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl p-2 bg-black border-0">
          <div className="relative aspect-square w-full">
            <Image
              src={data.image_url || "/placeholder.png"}
              alt={data.name}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const ProductViewSkeleton = () => {
  return (
    <div className="px-4 lg:px-12 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image skeleton */}
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-sm" />
          <div className="flex gap-2">
            <Skeleton className="size-16 rounded shrink-0" />
          </div>
        </div>

        {/* Info skeleton */}
        <div className="space-y-5">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-px w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-12 rounded-md" />
            <Skeleton className="h-12 rounded-md" />
            <Skeleton className="h-12 rounded-md" />
          </div>
          <Skeleton className="h-12 w-full rounded" />
          <Skeleton className="h-12 w-full rounded" />
          <Skeleton className="h-20 w-full rounded-md" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="space-y-4">
        <div className="flex gap-4 border-b pb-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    </div>
  );
};
