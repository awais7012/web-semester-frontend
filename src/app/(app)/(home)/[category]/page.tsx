import { ProductListView } from "@/modules/products/ui/views/product-list-view";

interface Props {
  params: Promise<{ category: string }>;
}

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  return <ProductListView category={category} />;
}
