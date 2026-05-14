"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ClockIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";
import { VendorSidebar } from "@/modules/vendor/ui/components/sidebar";

interface Props {
  children: React.ReactNode;
}

const VendorLayout = ({ children }: Props) => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/sign-in");
      return;
    }
    if (user.role !== "vendor" && user.role !== "admin") {
      router.replace("/");
    }
    if (user.status === "blocked") {
      router.replace("/sign-in");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F4F0]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
      </div>
    );
  }

  if (user?.status === "pending" && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#F4F4F0] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-yellow-100 rounded-full p-4">
              <ClockIcon className="size-8 text-yellow-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-2">Pending Approval</h1>
          <p className="text-gray-600 mb-6">
            Your vendor account is awaiting admin approval. You&apos;ll be able to access your dashboard once an admin reviews your application.
          </p>
          <Link
            href="/"
            className="inline-block bg-black text-white px-6 py-3 rounded-xl font-medium hover:bg-pink-400 hover:text-black transition-colors"
          >
            Browse Marketplace
          </Link>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "vendor" && user.role !== "admin")) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#F4F4F0]">
      <VendorSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

export default VendorLayout;
