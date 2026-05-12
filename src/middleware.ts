import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. all root files inside /public (e.g. /favicon.ico)
     */
    "/((?!api/|_next/|_static/|_vercel|media/|[\\w-]+\\.\\w+).*)",
  ],
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "";

  // Strip port from root domain so "funroad.local:3000" → "funroad.local"
  // The host header always includes the port, and we need to compare the domain part only
  const rootDomainNoPort = rootDomain.split(":")[0];
  const hostnameNoPort = hostname.split(":")[0];

  // Check if this request is for a tenant subdomain
  // e.g. "awais12354.funroad.local:3000" → slug = "awais12354"
  //      "awais12354.funroad.com"         → slug = "awais12354"
  if (hostnameNoPort.endsWith(`.${rootDomainNoPort}`)) {
    const tenantSlug = hostnameNoPort.replace(`.${rootDomainNoPort}`, "");

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Tenant Middleware] host="${hostname}" → slug="${tenantSlug}" → rewrite to /tenants/${tenantSlug}${url.pathname}`
      );
    }

    return NextResponse.rewrite(
      new URL(`/tenants/${tenantSlug}${url.pathname}`, req.url)
    );
  }

  return NextResponse.next();
}
