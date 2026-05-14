"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircleIcon, XCircleIcon, LoaderIcon } from "lucide-react";

import { authApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export const VerifyEmailView = () => {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link.");
      return;
    }
    authApi.verifyEmail(token).then((res) => {
      if (res.success) {
        setStatus("success");
        setMessage(res.data?.message ?? "Email verified!");
      } else {
        setStatus("error");
        setMessage(res.error ?? "Verification failed");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F4F0] flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <LoaderIcon className="size-10 animate-spin mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-semibold">Verifying your email…</h2>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircleIcon className="size-10 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-semibold mb-2">Email verified!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Button asChild className="bg-black text-white hover:bg-pink-400 hover:text-black">
              <Link href="/sign-in">Sign in to continue</Link>
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <XCircleIcon className="size-10 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-semibold mb-2">Verification failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link href="/sign-in" className="underline text-sm font-medium">
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
