"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon, InboxIcon, LoaderIcon, XCircleIcon } from "lucide-react";

import { checkoutApi, type Product } from "@/lib/api-client";
import { generateTenantURL } from "@/lib/utils";
import { Input } from "@/components/ui/input";

import { useCart } from "../../hooks/use-cart";
import { CheckoutItem } from "../components/checkout-item";
import { CheckoutSidebar } from "../components/checkout-sidebar";
import { useCheckoutStates } from "../../hooks/use-checkout-states";

// Pakistani mobile: 03xxxxxxxxx (11 digits) or +923xxxxxxxxx
const PK_PHONE_RE = /^(\+92|0)3[0-9]{9}$/;

interface CheckoutViewProps {
  tenantSlug: string;
}

export const CheckoutView = ({ tenantSlug }: CheckoutViewProps) => {
  const router = useRouter();
  const [states, setStates] = useCheckoutStates();
  const { productIds, addProduct, removeProduct, clearCart } = useCart(tenantSlug);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Compute quantities from the productIds array (duplicates = quantity > 1)
  const quantities = productIds.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});
  const uniqueIds = Object.keys(quantities);

  // Load product details
  useEffect(() => {
    if (uniqueIds.length === 0) {
      setProducts([]);
      setIsLoading(false);
      return;
    }
    checkoutApi.getProducts(uniqueIds, tenantSlug).then((res) => {
      if (res.success && res.data) setProducts(res.data);
      setIsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIds.join(","), tenantSlug]);

  // After Stripe redirects back with ?success=true&session_id=..., verify the payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (states.success && sessionId) {
      setIsVerifying(true);
      checkoutApi.verifySession(sessionId, tenantSlug).then((res) => {
        setIsVerifying(false);
        if (res.success) {
          clearCart();
        } else {
          toast.error(res.error ?? "Could not confirm your order. Contact support.");
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [states.success]);

  const handlePurchase = async () => {
    const storedUser = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
    if (!storedUser) {
      router.push("/sign-in");
      return;
    }

    if (!phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (!PK_PHONE_RE.test(phone.trim())) {
      toast.error("Enter a valid Pakistani phone number (e.g. 03001234567)");
      return;
    }
    if (!address.trim() || address.trim().length < 10) {
      toast.error("Please enter a full shipping address (at least 10 characters)");
      return;
    }

    setIsPurchasing(true);

    const res = await checkoutApi.createSession(
      {
        product_ids: Object.entries(quantities).map(([id, qty]) => ({ product_id: Number(id), quantity: qty })),
        phone: phone.trim(),
        address: address.trim(),
      },
      tenantSlug
    );

    setIsPurchasing(false);

    if (!res.success || !res.data?.url) {
      const rawError = res.error ?? "";
      const friendlyError = rawError.toLowerCase().includes("tenant context")
        ? "This store is currently unavailable. Try clearing your cart and shopping again."
        : rawError || "Failed to start checkout";
      toast.error(friendlyError);
      return;
    }

    // Redirect to Stripe Checkout
    window.location.href = res.data.url;
  };

  if (isLoading) {
    return (
      <div className="lg:pt-16 pt-4 px-4 lg:px-12">
        <div className="border border-black border-dashed flex items-center justify-center p-8 flex-col gap-y-4 bg-white w-full rounded-lg">
          <LoaderIcon className="text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  if (states.success) {
    return (
      <div className="lg:pt-16 pt-4 px-4 lg:px-12">
        <div className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl bg-white p-10 flex flex-col items-center gap-4 text-center max-w-md mx-auto">
          {isVerifying ? (
            <>
              <LoaderIcon className="size-16 animate-spin text-gray-400" />
              <h2 className="text-2xl font-bold">Confirming your order…</h2>
              <p className="text-gray-500 text-sm">Please wait, do not close this page.</p>
            </>
          ) : (
            <>
              <CheckCircleIcon className="size-16 text-green-500" />
              <h2 className="text-2xl font-bold">Payment successful!</h2>
              <p className="text-gray-500 text-sm">
                Your order is confirmed. Check your library to access your purchase.
              </p>
              <Link
                href="/library"
                className="mt-2 w-full bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-400 hover:text-black transition-colors text-center"
              >
                Go to My Library
              </Link>
              <Link
                href={generateTenantURL(tenantSlug)}
                className="w-full border border-black text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center"
              >
                Continue Shopping
              </Link>
            </>
          )}
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
            className="mt-2 w-full bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-400 hover:text-black transition-colors"
          >
            Back to checkout
          </button>
          <Link
            href={generateTenantURL(tenantSlug)}
            className="w-full border border-black text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="lg:pt-16 pt-4 px-4 lg:px-12">
        <div className="border border-black border-dashed flex items-center justify-center p-12 flex-col gap-y-4 bg-white w-full rounded-lg text-center">
          <InboxIcon className="size-10 text-gray-400" />
          <p className="text-lg font-semibold">Your cart is empty</p>
          <p className="text-sm text-muted-foreground">Browse the store and add some products.</p>
          <Link
            href={generateTenantURL(tenantSlug)}
            className="mt-2 bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-400 hover:text-black transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const total = products.reduce((sum, p) => sum + Number(p.price) * (quantities[String(p.id)] ?? 1), 0);

  return (
    <div className="lg:pt-16 pt-4 px-4 lg:px-12">
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 lg:gap-16">
        <div className="lg:col-span-4">
          <div className="border rounded-md overflow-hidden bg-white">
            {products.map((product, index) => {
              const qty = quantities[String(product.id)] ?? 1;
              return (
                <CheckoutItem
                  key={product.id}
                  isLast={index === products.length - 1}
                  imageUrl={product.image_url}
                  name={product.name}
                  productUrl={`${generateTenantURL(product.tenant_slug)}/products/${product.id}`}
                  tenantUrl={generateTenantURL(product.tenant_slug)}
                  tenantName={product.tenant_name}
                  price={product.price}
                  quantity={qty}
                  onAdd={() => addProduct(String(product.id))}
                  onRemoveOne={() => removeProduct(String(product.id))}
                  onRemoveAll={() => {
                    for (let i = 0; i < qty; i++) removeProduct(String(product.id));
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="border rounded-md overflow-hidden bg-white p-4 mb-4">
            <h2 className="font-semibold text-base mb-3">Delivery info</h2>
            <div className="space-y-3">
              <Input
                placeholder="Phone number (e.g. 03001234567) *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                placeholder="Full shipping address *"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
          <CheckoutSidebar
            total={total}
            onPurchase={handlePurchase}
            isCanceled={states.cancel}
            disabled={isPurchasing}
          />
        </div>
      </div>
    </div>
  );
};
