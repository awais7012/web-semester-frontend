import { SignUpView } from "@/modules/auth/ui/views/sign-up-view";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ role?: string }>;
}

export default async function SignUpPage({ searchParams }: PageProps) {
  const { role } = await searchParams;
  const initialRole = role === "vendor" ? "vendor" : "user";
  return <SignUpView initialRole={initialRole} />;
}
