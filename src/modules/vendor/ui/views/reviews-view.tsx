"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageSquareIcon, StarIcon, ReplyIcon, CheckCircle2Icon } from "lucide-react";

import { vendorApi, reviewsApi, type Review } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <StarIcon
          key={s}
          className={`size-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "fill-zinc-100 text-zinc-200"}`}
        />
      ))}
    </div>
  );
}

export const ReviewsView = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    vendorApi.reviews().then((res) => {
      if (res.success && res.data) setReviews(res.data);
      setIsLoading(false);
    });
  }, []);

  const handleReply = async (reviewId: number) => {
    if (!replyText.trim()) { toast.error("Reply cannot be empty"); return; }
    setIsSaving(true);
    const res = await reviewsApi.reply(reviewId, replyText.trim());
    setIsSaving(false);
    if (!res.success) { toast.error(res.error ?? "Failed to save reply"); return; }
    setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, vendor_reply: replyText.trim() } : r));
    setReplyingTo(null);
    setReplyText("");
    toast.success("Reply saved!");
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900">Customer Reviews</h1>
        <p className="text-zinc-500 mt-1 text-sm">Respond to customers and build trust.</p>
      </div>

      {/* Summary strip */}
      {!isLoading && reviews.length > 0 && (
        <div className="flex items-center gap-6 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4 mb-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-zinc-900">{avgRating}</p>
            <div className="mt-1 flex justify-center">
              <StarRow rating={Math.round(Number(avgRating))} />
            </div>
          </div>
          <div className="w-px h-10 bg-amber-200" />
          <div>
            <p className="text-sm font-semibold text-zinc-700">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{reviews.filter((r) => r.vendor_reply).length} replied</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-zinc-100 animate-pulse rounded-2xl" />)}
        </div>
      )}

      {!isLoading && reviews.length === 0 && (
        <div className="text-center py-24 text-zinc-400">
          <MessageSquareIcon className="size-14 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-semibold text-zinc-600">No reviews yet</p>
          <p className="text-sm mt-1">Customer reviews will appear here once they purchase your products.</p>
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:shadow-sm transition-all duration-200 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Product + user */}
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full truncate max-w-[180px]">
                    {review.product_name ?? "Product"}
                  </span>
                  {review.is_approved ? (
                    <span className="text-xs bg-emerald-50 text-emerald-600 font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2Icon className="size-3" /> Approved
                    </span>
                  ) : (
                    <span className="text-xs bg-amber-50 text-amber-600 font-medium px-2 py-0.5 rounded-full">Pending approval</span>
                  )}
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <StarRow rating={review.rating} />
                  <span className="text-sm font-semibold text-zinc-800">{review.username}</span>
                  <span className="text-xs text-zinc-400">
                    {new Date(review.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>

                {review.comment && (
                  <p className="text-sm text-zinc-700 leading-relaxed">{review.comment}</p>
                )}
              </div>

              <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 font-bold text-zinc-500 text-sm">
                {review.rating}
              </div>
            </div>

            {/* Vendor reply display */}
            {review.vendor_reply && replyingTo !== review.id && (
              <div className="mt-3 bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                <p className="text-xs font-semibold text-zinc-400 mb-1 flex items-center gap-1">
                  <ReplyIcon className="size-3" /> Your reply
                </p>
                <p className="text-sm text-zinc-700">{review.vendor_reply}</p>
                <button
                  onClick={() => { setReplyingTo(review.id); setReplyText(review.vendor_reply ?? ""); }}
                  className="text-xs text-zinc-400 hover:text-black underline mt-2 transition-colors"
                >
                  Edit reply
                </button>
              </div>
            )}

            {/* Reply trigger */}
            {!review.vendor_reply && replyingTo !== review.id && (
              <button
                onClick={() => { setReplyingTo(review.id); setReplyText(""); }}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-black transition-colors"
              >
                <ReplyIcon className="size-3.5" /> Reply to this review
              </button>
            )}

            {/* Reply input */}
            {replyingTo === review.id && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a helpful, professional reply…"
                  rows={3}
                  className="text-sm rounded-xl"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-black text-white hover:bg-pink-500 hover:text-black transition-colors rounded-lg"
                    disabled={isSaving}
                    onClick={() => handleReply(review.id)}
                  >
                    {isSaving ? "Saving…" : "Post reply"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => { setReplyingTo(null); setReplyText(""); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
