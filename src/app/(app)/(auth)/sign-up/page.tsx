import { redirect } from "next/navigation";

import { caller } from "@/trpc/server";

import { SignUpView } from "@/modules/auth/ui/views/sign-up-view";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ role?: string }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const session = await caller.auth.session();

  if (session.user) {
    redirect("/");
  }

  const { role } = await searchParams;
  const initialRole = role === "vendor" ? "vendor" : "user";

  return <SignUpView initialRole={initialRole} />
}

export default Page;
