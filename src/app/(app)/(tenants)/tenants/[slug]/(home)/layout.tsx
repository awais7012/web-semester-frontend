import { Suspense } from "react";
import { headers } from "next/headers";

import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { Footer } from "@/modules/tenants/ui/components/footer";
import { Navbar, NavbarSkeleton } from "@/modules/tenants/ui/components/navbar";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

const Layout = async ({ children, params }: LayoutProps) => {
  const { slug } = await params;
  const isDev = process.env.NODE_ENV === "development";
  const isSubdomainMode = process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING === "true";

  let hostname = "";
  if (isDev) {
    const hdrs = await headers();
    hostname = hdrs.get("host") || "";
  }

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(trpc.tenants.getOne.queryOptions({
    slug,
  }));

  return (
    <div className="min-h-screen bg-[#F4F4F0] flex flex-col">
      {isDev && (
        <div className="bg-yellow-400 text-yellow-900 text-xs font-mono px-4 py-1 flex items-center gap-4 border-b border-yellow-500">
          <span className="font-bold">DEV</span>
          <span>tenant: <strong>{slug}</strong></span>
          <span>host: <strong>{hostname}</strong></span>
          <span>routing: <strong>{isSubdomainMode ? "subdomain" : "path-based"}</strong></span>
          {!isSubdomainMode && (
            <span className="text-yellow-700 italic">
              set NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING=true to test subdomains
            </span>
          )}
        </div>
      )}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<NavbarSkeleton />}>
          <Navbar slug={slug} />
        </Suspense>
      </HydrationBoundary>
      <div className="flex-1">
        <div className="max-w-(--breakpoint-xl) mx-auto">
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
};
 
export default Layout;
