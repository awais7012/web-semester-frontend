import { ProductListView } from "@/modules/products/ui/views/product-list-view";

interface Props {
  params: Promise<{ subcategory: string }>;
}

export const dynamic = "force-dynamic";

export default async function SubcategoryPage({ params }: Props) {
  const { subcategory } = await params;
  return <ProductListView category={subcategory} />;
}
