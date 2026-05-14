"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2Icon, AlertCircleIcon, LoaderIcon, ExternalLinkIcon, StoreIcon, UserIcon, LinkIcon } from "lucide-react";

import { vendorApi, type VendorStore } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0">
      <span className="text-sm text-zinc-500">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-violet-600 hover:underline flex items-center gap-1">
          {value} <ExternalLinkIcon className="size-3" />
        </a>
      ) : (
        <span className="text-sm font-semibold text-zinc-800">{value}</span>
      )}
    </div>
  );
}

export const SettingsView = () => {
  const [store, setStore] = useState<VendorStore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    vendorApi.store().then((res) => {
      if (res.success && res.data) setStore(res.data);
      setIsLoading(false);
    });
  }, []);

  const handleSkipStripe = async () => {
    setIsPending(true);
    const res = await vendorApi.markVerified();
    setIsPending(false);
    if (!res.success) { toast.error(res.error ?? "Failed to activate store"); return; }
    toast.success("Store activated!");
    setStore((prev) => prev ? { ...prev, tenant: { ...prev.tenant, stripe_details_submitted: true } } : prev);
  };

  const handleStripeConnect = async () => {
    setIsConnecting(true);
    const res = await vendorApi.stripeConnectLink();
    setIsConnecting(false);
    if (!res.success || !res.data) { toast.error(res.error ?? "Failed to create Stripe link"); return; }
    window.location.href = res.data.url;
  };

  const tenant = store?.tenant;
  const isVerified = tenant?.stripe_details_submitted ?? false;

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-zinc-900">Settings</h1>
        <p className="text-zinc-500 mt-1 text-sm">Manage your store and payment configuration.</p>
      </div>

      {/* Store info card */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 bg-zinc-50">
          <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
            <StoreIcon className="size-4 text-violet-600" />
          </div>
          <h2 className="font-semibold text-zinc-900">Store info</h2>
        </div>

        <div className="px-5">
          {isLoading ? (
            <div className="py-6 flex justify-center">
              <LoaderIcon className="animate-spin size-5 text-zinc-300" />
            </div>
          ) : (
            <>
              <InfoRow label="Store name" value={tenant?.name ?? "—"} />
              <InfoRow label="Store slug" value={tenant?.slug ?? "—"} />
              <InfoRow label="Username" value={store?.username ?? "—"} />
              <InfoRow
                label="Store URL"
                value={`/tenants/${tenant?.slug}`}
                href={`/tenants/${tenant?.slug}`}
              />
            </>
          )}
        </div>
      </div>

      {/* Payments card */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 bg-zinc-50">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <LinkIcon className="size-4 text-blue-600" />
          </div>
          <h2 className="font-semibold text-zinc-900">Payments &amp; Stripe</h2>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <LoaderIcon className="animate-spin size-5 text-zinc-300" />
            </div>
          ) : isVerified ? (
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-4">
              <CheckCircle2Icon className="size-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800">Store is active</p>
                <p className="text-sm text-emerald-600 mt-0.5">You can create products and accept payments.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 rounded-xl p-4">
                <AlertCircleIcon className="size-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800">Store not active yet</p>
                  <p className="text-sm text-amber-600 mt-0.5">
                    Connect Stripe to receive payouts, or skip to use the platform account.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleStripeConnect}
                  disabled={isConnecting || isPending}
                  className="flex-1 bg-[#635BFF] hover:bg-[#4F46E5] text-white gap-2 rounded-xl"
                >
                  <ExternalLinkIcon className="size-4" />
                  {isConnecting ? "Redirecting…" : "Connect Stripe"}
                </Button>
                <Button
                  onClick={handleSkipStripe}
                  disabled={isPending || isConnecting}
                  variant="outline"
                  className="flex-1 rounded-xl"
                >
                  {isPending ? "Activating…" : "Skip — use platform account"}
                </Button>
              </div>

              <p className="text-xs text-zinc-400">
                Skipping means all payments go to the platform. You can connect Stripe anytime.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 bg-zinc-50">
          <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
            <UserIcon className="size-4 text-zinc-500" />
          </div>
          <h2 className="font-semibold text-zinc-900">Account</h2>
        </div>
        <div className="px-5">
          <InfoRow label="Username" value={store?.username ?? "—"} />
        </div>
      </div>
    </div>
  );
};
