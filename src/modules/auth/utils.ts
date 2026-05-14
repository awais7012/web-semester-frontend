import { cookies as getCookies } from "next/headers";

interface Props {
  prefix: string;
  value: string;
};

export const generateAuthCookie = async ({
  prefix,
  value,
}: Props) => {
  const cookies = await getCookies();
  const isSubdomainEnabled = process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING === "true";
  const isProduction = process.env.NODE_ENV === "production";

  // Strip port from domain — cookie domain attribute does not accept ports
  const cookieDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "").split(":")[0];

  cookies.set({
    name: `${prefix}-token`,
    value,
    httpOnly: true,
    path: "/",
    ...(isSubdomainEnabled && {
      domain: cookieDomain,
      // "none" requires secure (HTTPS), so use "lax" for local HTTP
      sameSite: isProduction ? "none" : "lax",
      ...(isProduction && { secure: true }),
    }),
  });
};
