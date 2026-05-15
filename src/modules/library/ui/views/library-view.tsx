"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon, BookOpenIcon, PackageIcon } from "lucide-react";

import { ProductList } from "../components/product-list";
import { OrderList } from "../components/order-list";

export const LibraryView = () => {
  const [tab, setTab] = useState<"purchases" | "orders">("purchases");

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
            <p className="text-white/70 mt-2 text-base">All your digital products and orders in one place.</p>
          </div>
        </div>

        {/* Tabs inside hero */}
        <div className="max-w-screen-xl mx-auto mt-8 flex gap-2">
          <button
            onClick={() => setTab("purchases")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === "purchases" ? "bg-white text-violet-700" : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            <BookOpenIcon className="size-4" />
            Products
          </button>
          <button
            onClick={() => setTab("orders")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === "orders" ? "bg-white text-violet-700" : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            <PackageIcon className="size-4" />
            Orders &amp; Delivery
          </button>
        </div>
      </div>

      {/* Content */}
      <section className="max-w-screen-xl mx-auto px-4 lg:px-12 py-10">
        {tab === "purchases" ? <ProductList /> : <OrderList />}
      </section>
    </div>
  );
};
