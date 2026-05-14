"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, Trash2, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { reviewsApi } from "@/lib/api-client";
import { AdminTopNavbar } from "@/components/admin/top-navbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Review {
  id: number;
  product_name: string;
  username: string;
  rating: number;
  comment: string | null;
  vendor_reply: string | null;
  is_approved: boolean;
  created_at: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn("w-3.5 h-3.5", s <= rating ? "text-amber-400 fill-amber-400" : "text-zinc-300")}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews]       = useState<Review[]>([]);
  const [loading, setLoading]       = useState(true);
  const [ratingFilter, setRating]   = useState("");
  const [approvedFilter, setApproved] = useState("");
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const limit = 20;

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit };
    if (ratingFilter)   params.rating      = ratingFilter;
    if (approvedFilter !== "") params.is_approved = approvedFilter;
    const res = await reviewsApi.list(params);
    if (res.success && res.data) {
      setReviews(res.data as Review[]);
      setTotal(res.pagination?.total ?? 0);
    }
    setLoading(false);
  }, [page, ratingFilter, approvedFilter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  async function approveReview(id: number, approved: boolean) {
    const res = await reviewsApi.approve(id, approved);
    if (res.success) {
      toast.success(approved ? "Review approved" : "Review hidden");
      fetchReviews();
    } else {
      toast.error("Failed to update review");
    }
  }

  async function deleteReview(id: number) {
    if (!confirm("Delete this review permanently?")) return;
    const res = await reviewsApi.delete(id);
    if (res.success) {
      toast.success("Review deleted");
      fetchReviews();
    } else {
      toast.error("Failed to delete review");
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col min-h-full">
      <AdminTopNavbar title="Reviews" />

      <div className="flex-1 p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <select
            className="h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm px-3 text-zinc-700 dark:text-zinc-300"
            value={ratingFilter}
            onChange={(e) => { setRating(e.target.value); setPage(1); }}
          >
            <option value="">All Ratings</option>
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>{r} ★</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm px-3 text-zinc-700 dark:text-zinc-300"
            value={approvedFilter}
            onChange={(e) => { setApproved(e.target.value); setPage(1); }}
          >
            <option value="">All Reviews</option>
            <option value="1">Approved</option>
            <option value="0">Hidden</option>
          </select>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 self-center">
            {total} review{total !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  {["Product", "Customer", "Rating", "Comment", "Vendor Reply", "Status", "Actions"].map((h) => (
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
                ) : reviews.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-zinc-400">No reviews found</td>
                  </tr>
                ) : (
                  reviews.map((review) => (
                    <tr key={review.id} className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-3 max-w-36 truncate text-zinc-700 dark:text-zinc-300 text-xs font-medium">
                        {review.product_name}
                      </td>
                      <td className="px-5 py-3 text-zinc-600 dark:text-zinc-300">{review.username}</td>
                      <td className="px-5 py-3">
                        <StarRating rating={review.rating} />
                      </td>
                      <td className="px-5 py-3 max-w-48">
                        <p className="text-zinc-600 dark:text-zinc-300 text-xs line-clamp-2">
                          {review.comment ?? <span className="text-zinc-400 italic">No comment</span>}
                        </p>
                      </td>
                      <td className="px-5 py-3 max-w-48">
                        <p className="text-zinc-500 text-xs line-clamp-2 italic">
                          {review.vendor_reply ?? <span className="text-zinc-400">—</span>}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          review.is_approved
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                        )}>
                          {review.is_approved ? "Approved" : "Hidden"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {review.is_approved ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-amber-600"
                              onClick={() => approveReview(review.id, false)}
                              title="Hide"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-emerald-600"
                              onClick={() => approveReview(review.id, true)}
                              title="Approve"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-500"
                            onClick={() => deleteReview(review.id)}
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
