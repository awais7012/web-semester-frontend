import Link from "next/link";
import { ArrowLeftIcon, BookOpenIcon } from "lucide-react";

import { ProductList } from "../components/product-list";

export const LibraryView = () => {
  return (
    <div className="min-h-screen bg-[#F4F4F0]">
      {/* Top nav */}
      <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-zinc-100 px-4 lg:px-12 py-3 flex items-center gap-3">
        <Link prefetch href="/" className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">
          <ArrowLeftIcon className="size-4" />
          Continue shopping
        </Link>
      </nav>

      {/* Hero header */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white px-4 lg:px-12 py-12">
        <div className="max-w-screen-xl mx-auto flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <BookOpenIcon className="size-5" />
              </div>
              <span className="text-white/70 text-sm font-medium uppercase tracking-widest">My Library</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">Your purchases</h1>
            <p className="text-white/70 mt-2 text-base">All your digital products in one place.</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <section className="max-w-screen-xl mx-auto px-4 lg:px-12 py-10">
        <ProductList />
      </section>
    </div>
  );
};
