import { ProductListView } from "@/modules/products/ui/views/product-list-view";

interface Props {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

const Page = async ({ params }: Props) => {
  const { slug } = await params;
  return <ProductListView tenantSlug={slug} narrowView />;
};

export default Page;
