import { Suspense } from "react";
import { ProductView, ProductViewSkeleton } from "@/modules/library/ui/views/product-view";

interface Props {
  params: Promise<{ productId: string }>;
}

export const dynamic = "force-dynamic";

export default async function LibraryProductPage({ params }: Props) {
  const { productId } = await params;
  return (
    <Suspense fallback={<ProductViewSkeleton />}>
      <ProductView productId={productId} />
    </Suspense>
  );
}
