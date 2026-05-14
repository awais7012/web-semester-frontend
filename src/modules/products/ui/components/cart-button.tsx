import Link from "next/link";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { useCart } from "@/modules/checkout/hooks/use-cart";
import { useCartStore } from "@/modules/checkout/store/use-cart-store";

interface Props {
  tenantSlug: string;
  productId: string;
  isPurchased?: boolean;
  className?: string;
};

export const CartButton = ({ tenantSlug, productId, isPurchased, className }: Props) => {
  const cart = useCart(tenantSlug);
  const allCarts = useCartStore((s) => s.tenantCarts);

  if (isPurchased) {
    return (
      <Button
        variant="elevated"
        asChild
        className={cn("w-full font-semibold h-12 text-base bg-white", className)}
      >
        <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/library/${productId}`}>
          View in Library
        </Link>
      </Button>
    );
  }

  const handleClick = () => {
    if (!cart.isProductInCart(productId)) {
      // Warn if user has items in a DIFFERENT store's cart
      const otherSlug = Object.keys(allCarts).find(
        (slug) => slug !== tenantSlug && (allCarts[slug]?.productIds.length ?? 0) > 0
      );
      if (otherSlug) {
        toast.info(
          `Each store has its own cart. Your "${otherSlug}" cart is still saved — checkout from that store separately.`,
          { duration: 5000 }
        );
      }
    }
    cart.toggleProduct(productId);
  };

  return (
    <Button
      variant="elevated"
      className={cn(
        "w-full font-semibold h-12 text-base",
        cart.isProductInCart(productId) ? "bg-white" : "bg-pink-400",
        className
      )}
      onClick={handleClick}
    >
      {cart.isProductInCart(productId) ? "Remove from cart" : "Add to cart"}
    </Button>
  );
};
