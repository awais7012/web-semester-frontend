import { ProductSort } from "../components/product-sort"
import { ProductFilters } from "../components/product-filters"
import { ProductList } from "../components/product-list"

interface Props {
  category?: string;
  tenantSlug?: string;
  narrowView?: boolean;
}

export const ProductListView = ({ category, tenantSlug, narrowView }: Props) => {
  return (
    <div className="flex flex-col">
      {/* Hero — only on main marketplace root, not category pages or tenant stores */}
      {!tenantSlug && !category && (
        <div className="relative overflow-hidden bg-black text-white px-6 lg:px-12 py-14 lg:py-20">
          {/* Decorative blobs */}
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 left-10 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-2xl">
            <div className="flex items-center gap-2 mb-5">
              <span className="inline-block bg-pink-400 text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Digital Marketplace
              </span>
              <span className="text-zinc-400 text-xs">Powered by Funroad</span>
            </div>
            <h1 className="text-4xl lg:text-6xl font-extrabold mb-4 leading-[1.1] tracking-tight">
              Discover amazing<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400">
                digital products
              </span>
            </h1>
            <p className="text-zinc-300 text-base lg:text-lg max-w-lg">
              eBooks, courses, templates, software &amp; more — from independent creators worldwide.
            </p>
            <div className="flex items-center gap-6 mt-8 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Instant download</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />Secure checkout</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-pink-400 inline-block" />30-day refunds</span>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 lg:px-12 py-8 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-y-2 lg:gap-y-0 justify-between">
          <p className="text-xl font-semibold text-zinc-900">
            {category ? `${category.charAt(0).toUpperCase() + category.slice(1)}` : "All products"}
          </p>
          <ProductSort />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-6 xl:grid-cols-8 gap-y-6 gap-x-8">
          <div className="lg:col-span-2 xl:col-span-2">
            <ProductFilters />
          </div>
          <div className="lg:col-span-4 xl:col-span-6">
            <ProductList category={category} tenantSlug={tenantSlug} narrowView={narrowView} />
          </div>
        </div>
      </div>
    </div>
  );
};
