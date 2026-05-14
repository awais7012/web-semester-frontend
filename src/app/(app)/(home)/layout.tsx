import { Suspense } from "react";

import { Navbar } from "@/modules/home/ui/components/navbar";
import { Footer } from "@/modules/home/ui/components/footer";
import { SearchFilters, SearchFiltersSkeleton } from "@/modules/home/ui/components/search-filters";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Suspense fallback={<SearchFiltersSkeleton />}>
        <SearchFilters />
      </Suspense>
      <div className="flex-1 bg-zinc-50">
        {children}
      </div>
      <Footer />
    </div>
  );
}
