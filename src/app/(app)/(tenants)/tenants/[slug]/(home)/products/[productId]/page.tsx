import { Suspense } from "react";

import { ProductView, ProductViewSkeleton } from "@/modules/products/ui/views/product-view";

interface Props {
  params: Promise<{ productId: string; slug: string }>;
};

export const dynamic = "force-dynamic";

const Page = async ({ params }: Props) => {
  const { productId, slug } = await params;

  return (
    <Suspense fallback={<ProductViewSkeleton />}>
      <ProductView productId={productId} tenantSlug={slug} />
    </Suspense>
  );
};

export default Page;
