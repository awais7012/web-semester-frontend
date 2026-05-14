import z from "zod";
import { TRPCError } from "@trpc/server";

import { DEFAULT_LIMIT } from "@/constants";
import { Media, Tenant } from "@/payload-types";
import { createTRPCRouter, vendorProcedure } from "@/trpc/init";

export const vendorRouter = createTRPCRouter({
  // Stats for the vendor dashboard overview
  getStats: vendorProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.findByID({
      collection: "users",
      id: ctx.session.user.id,
      depth: 1,
    });

    const tenantId = (user.tenants?.[0]?.tenant as Tenant)?.id;
    if (!tenantId) {
      return { productCount: 0, orderCount: 0, totalRevenue: 0 };
    }

    const tenant = await ctx.db.findByID({ collection: "tenants", id: tenantId });

    const products = await ctx.db.find({
      collection: "products",
      pagination: false,
      where: { "tenant.id": { equals: tenantId } },
    });

    const orders = await ctx.db.find({
      collection: "orders",
      pagination: false,
      where: { stripeAccountId: { equals: tenant.stripeAccountId } },
      depth: 1,
    });

    // Sum revenue from product prices on each order
    const totalRevenue = orders.docs.reduce((sum, order) => {
      const product = order.product as { price?: number } | null;
      return sum + (product && typeof product === "object" ? (product.price ?? 0) : 0);
    }, 0);

    return {
      productCount: products.totalDocs,
      orderCount: orders.totalDocs,
      totalRevenue,
    };
  }),

  // Vendor's own products (paginated)
  getProducts: vendorProcedure
    .input(
      z.object({
        cursor: z.number().default(1),
        limit: z.number().default(DEFAULT_LIMIT),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 1,
      });

      const tenantId = (user.tenants?.[0]?.tenant as Tenant)?.id;
      if (!tenantId) return { docs: [], totalDocs: 0, hasNextPage: false };

      const data = await ctx.db.find({
        collection: "products",
        depth: 1,
        page: input.cursor,
        limit: input.limit,
        where: { "tenant.id": { equals: tenantId } },
      });

      return {
        ...data,
        docs: data.docs.map((doc) => ({
          ...doc,
          image: doc.image as Media | null,
        })),
      };
    }),

  // Vendor's sales (orders for their products)
  getOrders: vendorProcedure
    .input(
      z.object({
        cursor: z.number().default(1),
        limit: z.number().default(DEFAULT_LIMIT),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 1,
      });

      const tenantId = (user.tenants?.[0]?.tenant as Tenant)?.id;
      if (!tenantId) return { docs: [], totalDocs: 0, hasNextPage: false };

      const tenant = await ctx.db.findByID({ collection: "tenants", id: tenantId });

      const data = await ctx.db.find({
        collection: "orders",
        depth: 2,
        page: input.cursor,
        limit: input.limit,
        where: { stripeAccountId: { equals: tenant.stripeAccountId } },
      });

      return data;
    }),

  // Archive or unarchive a product
  toggleArchive: vendorProcedure
    .input(z.object({ productId: z.string(), archived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 1,
      });

      const tenantId = (user.tenants?.[0]?.tenant as Tenant)?.id;

      const product = await ctx.db.findByID({
        collection: "products",
        id: input.productId,
        depth: 1,
      });

      // Ensure the product belongs to this vendor
      const productTenantId =
        product.tenant && typeof product.tenant === "object"
          ? (product.tenant as Tenant).id
          : product.tenant;

      if (productTenantId !== tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your product" });
      }

      await ctx.db.update({
        collection: "products",
        id: input.productId,
        data: { isArchived: input.archived },
      });

      return { success: true };
    }),

  // Create a new product for the vendor's store
  createProduct: vendorProcedure
    .input(
      z.object({
        name: z.string().min(1, "Product name is required"),
        price: z.number().min(0, "Price must be positive"),
        description: z.string().optional(),
        categoryId: z.string().optional(),
        refundPolicy: z
          .enum(["30-day", "14-day", "7-day", "3-day", "1-day", "no-refunds"])
          .default("30-day"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 2,
      });

      const tenant = user.tenants?.[0]?.tenant as Tenant;
      if (!tenant?.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No store found for this account" });
      }
      if (!tenant.stripeDetailsSubmitted) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Complete Stripe verification in Settings before creating products",
        });
      }

      return ctx.db.create({
        collection: "products",
        data: {
          name: input.name,
          price: input.price,
          refundPolicy: input.refundPolicy,
          ...(input.categoryId ? { category: input.categoryId } : {}),
          tenant: tenant.id,
        },
      });
    }),

  // Get vendor's store info
  getStore: vendorProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.findByID({
      collection: "users",
      id: ctx.session.user.id,
      depth: 2,
    });

    const tenant = user.tenants?.[0]?.tenant as Tenant | null;
    return { tenant, username: user.username };
  }),

  // Reply to a review on vendor's product
  replyToReview: vendorProcedure
    .input(z.object({
      reviewId: z.string(),
      reply: z.string().min(1, "Reply cannot be empty"),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 2,
      });
      const tenant = user.tenants?.[0]?.tenant as Tenant | null;
      if (!tenant?.id) throw new TRPCError({ code: "FORBIDDEN", message: "No store found" });

      // Find the review and verify it belongs to a product owned by this vendor
      const review = await ctx.db.findByID({ collection: "reviews", id: input.reviewId, depth: 1 });
      const product = await ctx.db.findByID({ collection: "products", id: typeof review.product === "string" ? review.product : (review.product as any).id });
      const productTenantId = typeof product.tenant === "string" ? product.tenant : (product.tenant as any)?.id;
      if (productTenantId !== tenant.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your product" });
      }

      await ctx.db.update({
        collection: "reviews",
        id: input.reviewId,
        data: { vendorReply: input.reply } as any,
      });
      return { success: true };
    }),

  // Get all reviews for a vendor's product
  getProductReviews: vendorProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 2,
      });
      const tenant = user.tenants?.[0]?.tenant as Tenant | null;
      if (!tenant?.id) return { docs: [] };

      const product = await ctx.db.findByID({ collection: "products", id: input.productId, depth: 1 });
      const productTenantId = typeof product.tenant === "string" ? product.tenant : (product.tenant as any)?.id;
      if (productTenantId !== tenant.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your product" });
      }

      const reviews = await ctx.db.find({
        collection: "reviews",
        depth: 1,
        where: { product: { equals: input.productId } },
      });
      return reviews;
    }),

  // Update the status of an order
  updateOrderStatus: vendorProcedure
    .input(z.object({
      orderId: z.string(),
      status: z.enum(["pending", "processing", "shipped", "delivered"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.findByID({
        collection: "users",
        id: ctx.session.user.id,
        depth: 2,
      });
      const tenant = user.tenants?.[0]?.tenant as Tenant | null;
      if (!tenant?.id) throw new TRPCError({ code: "FORBIDDEN", message: "No store found" });

      const order = await ctx.db.findByID({ collection: "orders", id: input.orderId, depth: 1 });
      // Verify this order belongs to this vendor (via stripeAccountId match)
      if (order.stripeAccountId !== tenant.stripeAccountId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your order" });
      }

      await ctx.db.update({
        collection: "orders",
        id: input.orderId,
        data: { status: input.status } as any,
      });
      return { success: true };
    }),

  // Demo / test bypass: mark the vendor's Stripe account as verified without real onboarding
  markVerifiedDemo: vendorProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.findByID({
      collection: "users",
      id: ctx.session.user.id,
      depth: 2,
    });

    const tenant = user.tenants?.[0]?.tenant as Tenant | null;
    if (!tenant?.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No store found" });
    }

    await ctx.db.update({
      collection: "tenants",
      id: tenant.id,
      data: { stripeDetailsSubmitted: true },
    });

    return { success: true };
  }),
});
