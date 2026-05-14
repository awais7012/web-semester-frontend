"use client";

import { useState } from "react";
import { type Review } from "@/lib/api-client";
import { ReviewForm } from "./review-form";

interface Props {
  productId: string;
  initialReview?: Review | null;
}

export const ReviewSidebar = ({ productId, initialReview }: Props) => {
  const [review, setReview] = useState<Review | null | undefined>(initialReview);

  return (
    <ReviewForm
      productId={productId}
      initialData={review}
      onReviewSaved={(saved) => setReview(saved)}
    />
  );
};
