"use client";

import { toast } from "sonner";
import { CheckCircleIcon, AlertCircleIcon, LoaderIcon } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";

export const SettingsView = () => {
  const trpc = useTRPC();
  const store = useQuery(trpc.vendor.getStore.queryOptions());

  const verify = useMutation(
    trpc.checkout.verify.mutationOptions({
      onSuccess: (data) => {
        window.location.href = data.url;
      },
      onError: (e) => toast.error(e.message),
    })
  );

  const tenant = store.data?.tenant;
  const isVerified = tenant?.stripeDetailsSubmitted ?? false;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your store and Stripe account.</p>
      </div>

      {/* Store info */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Store info</h2>
        {store.isLoading ? (
          <LoaderIcon className="animate-spin size-5 text-gray-400" />
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Store name</span>
              <span className="font-medium">{tenant?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Store slug</span>
              <span className="font-medium">{tenant?.slug ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Store URL</span>
              <a
                href={`/tenants/${tenant?.slug}`}
                className="underline font-medium"
                target="_blank"
              >
                /tenants/{tenant?.slug}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Stripe verification */}
      <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Stripe account</h2>

        {store.isLoading ? (
          <LoaderIcon className="animate-spin size-5 text-gray-400" />
        ) : isVerified ? (
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircleIcon className="size-5" />
            <div>
              <p className="font-semibold">Stripe account verified</p>
              <p className="text-sm text-gray-500">You can create products and receive payments.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-amber-700">
              <AlertCircleIcon className="size-5" />
              <div>
                <p className="font-semibold">Stripe account not verified</p>
                <p className="text-sm text-gray-500">
                  You must complete Stripe onboarding before you can create products or receive payments.
                </p>
              </div>
            </div>
            <Button
              onClick={() => verify.mutate()}
              disabled={verify.isPending}
              className="bg-black text-white hover:bg-pink-400 hover:text-black"
            >
              {verify.isPending ? "Loading…" : "Verify Stripe account"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
