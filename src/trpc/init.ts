import { initTRPC, TRPCError } from '@trpc/server';
import { getPayload } from 'payload';
import config from "@payload-config";
import superjson from "superjson";
import { headers as getHeaders } from 'next/headers';
import { cache } from 'react';

export const createTRPCContext = cache(async () => {
  return { userId: 'user_123' };
});

const t = initTRPC.create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const baseProcedure = t.procedure.use(async ({ next }) => {
  const payload = await getPayload({ config });
  return next({ ctx: { db: payload } });
});

// Must be logged in (any role)
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const headers = await getHeaders();
  const session = await ctx.db.auth({ headers });

  if (!session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  return next({
    ctx: {
      ...ctx,
      session: { ...session, user: session.user },
    },
  });
});

// Must be logged in AND have "vendor" or "admin" role AND be approved (status=active)
export const vendorProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const roles = ctx.session.user.roles ?? [];
  const isVendorOrAdmin = roles.includes("vendor") || roles.includes("admin");

  if (!isVendorOrAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Vendor access required",
    });
  }

  const status = ctx.session.user.status;
  if (status === "pending") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your vendor account is pending admin approval",
    });
  }

  if (status === "blocked") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your account has been blocked",
    });
  }

  return next({ ctx });
});

// Must be logged in AND have "admin" role
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const roles = ctx.session.user.roles ?? [];

  if (!roles.includes("admin")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next({ ctx });
});
