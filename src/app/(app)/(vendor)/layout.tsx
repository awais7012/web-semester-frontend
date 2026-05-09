import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";

import { VendorSidebar } from "@/modules/vendor/ui/components/sidebar";

interface Props {
  children: React.ReactNode;
}

const VendorLayout = async ({ children }: Props) => {
  const payload = await getPayload({ config });
  const session = await payload.auth({ headers: await headers() });

  if (!session.user) {
    redirect("/sign-in");
  }

  const roles: string[] = (session.user as { roles?: string[] }).roles ?? [];

  if (!roles.includes("vendor") && !roles.includes("admin")) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-[#F4F4F0]">
      <VendorSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

export default VendorLayout;
