import { z } from "zod";

// ── Auth ──────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, underscores, and hyphens"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["vendor", "user"]).optional().default("user"),
  storeName: z.string().min(2).max(255).optional(),
  tenantSlug: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── Products ──────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive"),
  category_id: z.number().int().positive().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  cover_url: z.string().url().optional().nullable(),
  refund_policy: z
    .enum(["30-day", "14-day", "7-day", "3-day", "1-day", "no-refunds"])
    .optional()
    .default("30-day"),
  content: z.string().optional().nullable(),
  is_private: z.boolean().optional().default(false),
  tag_ids: z.array(z.number().int().positive()).optional().default([]),
});

export const updateProductSchema = createProductSchema.partial();

// ── Orders ────────────────────────────────────────────────────────────────────

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "cancelled", "refunded"]),
});

export const createOrderSchema = z.object({
  product_ids: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        quantity: z.number().int().positive().default(1),
      })
    )
    .min(1, "Order must contain at least one product"),
  notes: z.string().optional().nullable(),
});

// ── Reviews ───────────────────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  product_id: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().nullable(),
});

export const replyToReviewSchema = z.object({
  vendor_reply: z.string().min(1).max(2000),
});

// ── Tenants ───────────────────────────────────────────────────────────────────

export const createTenantSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens"),
  description: z.string().optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
});

export const updateTenantSchema = createTenantSchema.partial();

// ── Pagination ────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => Math.max(1, parseInt(v ?? "1", 10) || 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(100, Math.max(1, parseInt(v ?? "20", 10) || 20))),
});
