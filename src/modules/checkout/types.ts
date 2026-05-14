import type Stripe from "stripe";

export type ProductMetadata = {
  stripeAccountId: string;
  id: string;
  name: string;
  price: number;
};

export type CheckoutMetadata = {
  userId: string;
  tenantSlug?: string;
  phone?: string;
  address?: string;
};

export type ExpandedLineItem = Stripe.LineItem & {
  price: Stripe.Price & {
    product: Stripe.Product & {
      metadata: ProductMetadata,
    };
  };
};
