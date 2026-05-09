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
});
