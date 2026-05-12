import type { Stripe } from "stripe";
import { getPayload } from "payload";
import config from "@payload-config";
import { NextResponse } from "next/server";

import { getStripe } from "@/lib/stripe";
import { ExpandedLineItem } from "@/modules/checkout/types";

export async function POST(req: Request) {
  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      await (await req.blob()).text(),
      req.headers.get("stripe-signature") as string,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (error! instanceof Error) {
      console.log(error);
    }

    console.log(`❌ Error message: ${errorMessage}`);
    return NextResponse.json(
      { message: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    )
  }

  console.log("✅ Success:", event.id);

  const permittedEvents: string[] = [
    "checkout.session.completed",
    "account.updated"
  ];

  const payload = await getPayload({ config });

  if (permittedEvents.includes(event.type)) {
    let data;

    try {
      switch (event.type) {
        case "checkout.session.completed":
          data = event.data.object as Stripe.Checkout.Session;

          if (!data.metadata?.userId) {
            throw new Error("User ID is required");
          }

          const user = await payload.findByID({
            collection: "users",
            id: data.metadata.userId,
          });

          if (!user) {
            throw new Error("User not found");
          }

          // Retrieve expanded session — only pass stripeAccount for Connect events
          const expandedSession = await stripe.checkout.sessions.retrieve(
            data.id,
            { expand: ["line_items.data.price.product"] },
            event.account ? { stripeAccount: event.account } : undefined,
          );

          if (!expandedSession.line_items?.data?.length) {
            throw new Error("No line items found");
          }

          // For platform payments event.account is null, so look up the
          // vendor's stripeAccountId via the tenantSlug saved in metadata.
          let resolvedStripeAccountId: string | null = event.account ?? null;
          if (!resolvedStripeAccountId && data.metadata?.tenantSlug) {
            const tenantResult = await payload.find({
              collection: "tenants",
              limit: 1,
              where: { slug: { equals: data.metadata.tenantSlug } },
            });
            resolvedStripeAccountId = tenantResult.docs[0]?.stripeAccountId ?? null;
          }

          const lineItems = expandedSession.line_items.data as ExpandedLineItem[];

          for (const item of lineItems) {
            await payload.create({
              collection: "orders",
              data: {
                stripeCheckoutSessionId: data.id,
                stripeAccountId: resolvedStripeAccountId,
                user: user.id,
                product: item.price.product.metadata.id,
                name: item.price.product.name,
                phone: data.metadata?.phone || null,
                shippingAddress: data.metadata?.address || null,
              } as any,
            });
          }
          break;
        case "account.updated":
          data = event.data.object as Stripe.Account;

          await payload.update({
            collection: "tenants",
            where: {
              stripeAccountId: {
                equals: data.id,
              },
            },
            data: {
              stripeDetailsSubmitted: data.details_submitted,
            },
          });

        break;
        default:
          throw new Error(`Unhandled event: ${event.type}`);
      }
    } catch (error) {
      console.log(error)
      return NextResponse.json(
        { message: "Webhook handler failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ message: "Received" }, { status: 200 });
};
