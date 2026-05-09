import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { headers as getHeaders } from "next/headers";

import { getStripe } from "@/lib/stripe";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

import { generateAuthCookie } from "../utils";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../schemas";

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export const authRouter = createTRPCRouter({
  session: baseProcedure.query(async ({ ctx }) => {
    const headers = await getHeaders();
    const session = await ctx.db.auth({ headers });
    return session;
  }),

  register: baseProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      // Check username uniqueness
      const existing = await ctx.db.find({
        collection: "users",
        limit: 1,
        where: { username: { equals: input.username } },
      });

      if (existing.docs[0]) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Username already taken" });
      }

      // Vendors get a Stripe account + Tenant; plain users do not
      let tenantData: { tenant: string }[] = [];

      if (input.role === "vendor") {
        const account = await getStripe().accounts.create({});

        if (!account) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Failed to create Stripe account" });
        }

        const tenant = await ctx.db.create({
          collection: "tenants",
          data: {
            name: input.username,
            slug: input.username,
            stripeAccountId: account.id,
          },
        });

        tenantData = [{ tenant: tenant.id }];
      }

      // Generate email verification token (expires in 24 h)
      const verificationToken = generateToken();
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await ctx.db.create({
        collection: "users",
        data: {
          email: input.email,
          username: input.username,
          password: input.password,
          roles: [input.role],
          tenants: tenantData,
          emailVerified: false,
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationExpiry.toISOString(),
        },
      });

      // Send verification email (non-blocking — don't fail registration if email fails)
      sendVerificationEmail(input.email, verificationToken).catch(console.error);

      // Log them in immediately
      const data = await ctx.db.login({
        collection: "users",
        data: { email: input.email, password: input.password },
      });

      if (!data.token) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Failed to login after registration" });
      }

      await generateAuthCookie({ prefix: ctx.db.config.cookiePrefix, value: data.token });

      return { role: input.role };
    }),

  login: baseProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const data = await ctx.db.login({
        collection: "users",
        data: { email: input.email, password: input.password },
      });

      if (!data.token) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }

      await generateAuthCookie({ prefix: ctx.db.config.cookiePrefix, value: data.token });

      return data;
    }),

  verifyEmail: baseProcedure
    .input(verifyEmailSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db.find({
        collection: "users",
        limit: 1,
        where: { emailVerificationToken: { equals: input.token } },
      });

      const user = result.docs[0];

      if (!user) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired verification link" });
      }

      if (user.emailVerified) {
        return { message: "Email already verified" };
      }

      const expiry = user.emailVerificationExpiry
        ? new Date(user.emailVerificationExpiry)
        : null;

      if (!expiry || expiry < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Verification link has expired" });
      }

      await ctx.db.update({
        collection: "users",
        id: user.id,
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
        },
      });

      return { message: "Email verified successfully" };
    }),

  forgotPassword: baseProcedure
    .input(forgotPasswordSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db.find({
        collection: "users",
        limit: 1,
        where: { email: { equals: input.email } },
      });

      // Always return success — never reveal whether an email exists
      const user = result.docs[0];
      if (!user) return { message: "If that email exists, a reset link has been sent" };

      const resetToken = generateToken();
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await ctx.db.update({
        collection: "users",
        id: user.id,
        data: {
          passwordResetToken: resetToken,
          passwordResetExpiry: resetExpiry.toISOString(),
        },
      });

      sendPasswordResetEmail(input.email, resetToken).catch(console.error);

      return { message: "If that email exists, a reset link has been sent" };
    }),

  resetPassword: baseProcedure
    .input(resetPasswordSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await ctx.db.find({
        collection: "users",
        limit: 1,
        where: { passwordResetToken: { equals: input.token } },
      });

      const user = result.docs[0];

      if (!user) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset link" });
      }

      const expiry = user.passwordResetExpiry
        ? new Date(user.passwordResetExpiry)
        : null;

      if (!expiry || expiry < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Reset link has expired — request a new one" });
      }

      // Update password + clear reset token
      await ctx.db.update({
        collection: "users",
        id: user.id,
        data: {
          password: input.password,
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      });

      // Log them in with new password
      const data = await ctx.db.login({
        collection: "users",
        data: { email: user.email, password: input.password },
      });

      if (data.token) {
        await generateAuthCookie({ prefix: ctx.db.config.cookiePrefix, value: data.token });
      }

      return { message: "Password reset successfully" };
    }),
});
