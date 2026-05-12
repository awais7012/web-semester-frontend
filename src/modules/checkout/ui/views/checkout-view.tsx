"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon, InboxIcon, LoaderIcon, XCircleIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { generateTenantURL } from "@/lib/utils";
import { Input } from "@/components/ui/input";

import { useCart } from "../../hooks/use-cart";
import { CheckoutItem } from "../components/checkout-item";
import { CheckoutSidebar } from "../components/checkout-sidebar";
import { useCheckoutStates } from "../../hooks/use-checkout-states";

interface CheckoutViewProps {
  tenantSlug: string;
}

export const CheckoutView = ({ tenantSlug }: CheckoutViewProps) => {
  const router = useRouter();
  const [states, setStates] = useCheckoutStates();
  const { productIds, removeProduct, clearCart } = useCart(tenantSlug);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data, error, isLoading } = useQuery(trpc.checkout.getProducts.queryOptions({
    ids: productIds,
  }));

  const purchase = useMutation(trpc.checkout.purchase.mutationOptions({
    onMutate: () => {
      setStates({ success: false, cancel: false });
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      if (error.data?.code === "UNAUTHORIZED") {
        // TODO: Modify when subdomains enabled
        router.push("/sign-in");
      }

      toast.error(error.message);
    },
  }));

  useEffect(() => {
    if (states.success) {
      clearCart();
      queryClient.invalidateQueries(trpc.library.getMany.infiniteQueryFilter());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [states.success]);
  
  useEffect(() => {
    if (error?.data?.code === "NOT_FOUND") {
      clearCart();
      toast.warning("Invalid products found, cart cleared");
    }
  }, [error, clearCart]);

  if (isLoading) {
    return (
      <div className="lg:pt-16 pt-4 px-4 lg:px-12">
        <div className="border border-black border-dashed flex items-center justify-center p-8 flex-col gap-y-4 bg-white w-full rounded-lg">
          <LoaderIcon className="text-muted-foreground animate-spin" />
        </div>
      </div>
    )
  }

  if (states.success) {
    return (
      <div className="lg:pt-16 pt-4 px-4 lg:px-12">
        <div className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl bg-white p-10 flex flex-col items-center gap-4 text-center max-w-md mx-auto">
          <CheckCircleIcon className="size-16 text-green-500" />
          <h2 className="text-2xl font-bold">Payment successful!</h2>
          <p className="text-gray-500 text-sm">
            Your purchase is confirmed. It may take a few seconds to appear in your library.
          </p>
          <Link
            href="/library"
            className="mt-2 bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-400 hover:text-black transition-colors"
          >
            Go to My Library
          </Link>
        </div>
      </div>
    );
  }

  if (states.cancel) {
    return (
      <div className="lg:pt-16 pt-4 px-4 lg:px-12">
        <div className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl bg-white p-10 flex flex-col items-center gap-4 text-center max-w-md mx-auto">
          <XCircleIcon className="size-16 text-red-400" />
          <h2 className="text-2xl font-bold">Payment cancelled</h2>
          <p className="text-gray-500 text-sm">Your cart is still saved. Try again when you&apos;re ready.</p>
          <button
            onClick={() => setStates({ success: false, cancel: false })}
            className="mt-2 bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-400 hover:text-black transition-colors"
          >
            Back to checkout
          </button>
        </div>
      </div>
    );
  }

  if (data?.totalDocs === 0) {
    return (
      <div className="lg:pt-16 pt-4 px-4 lg:px-12">
        <div className="border border-black border-dashed flex items-center justify-center p-8 flex-col gap-y-4 bg-white w-full rounded-lg">
          <InboxIcon />
          <p className="text-base font-medium">No products found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:pt-16 pt-4 px-4 lg:px-12">
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 lg:gap-16">

        <div className="lg:col-span-4">
          <div className="border rounded-md overflow-hidden bg-white">
            {data?.docs.map((product, index) => (
              <CheckoutItem
                key={product.id}
                isLast={index === data.docs.length - 1}
                imageUrl={product.image?.url}
                name={product.name}
                productUrl={`${generateTenantURL(product.tenant.slug)}/products/${product.id}`}
                tenantUrl={generateTenantURL(product.tenant.slug)}
                tenantName={product.tenant.name}
                price={product.price}
                onRemove={() => removeProduct(product.id)}
              />
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="border rounded-md overflow-hidden bg-white p-4 mb-4">
            <h2 className="font-semibold text-base mb-3">Delivery info</h2>
            <div className="space-y-3">
              <Input
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                placeholder="Shipping address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
          <CheckoutSidebar
            total={data?.totalPrice || 0}
            onPurchase={() => purchase.mutate({ tenantSlug, productIds, phone, address })}
            isCanceled={states.cancel}
            disabled={purchase.isPending}
          />
        </div>

      </div>
    </div>
  );
};
