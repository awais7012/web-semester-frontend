"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderIcon } from "lucide-react";
import { toast } from "sonner";

import { vendorApi } from "@/lib/api-client";

const Page = () => {
  const router = useRouter();

  useEffect(() => {
    vendorApi.markVerified().then((res) => {
      if (res.success) {
        toast.success("Store verified!");
        router.push("/vendor/dashboard");
      } else {
        toast.error(res.error ?? "Verification failed");
        router.push("/vendor/settings");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoaderIcon className="animate-spin text-muted-foreground" />
    </div>
  );
};

export default Page;
