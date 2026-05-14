import { Request } from "express";

// ── Database row shapes ───────────────────────────────────────────────────────

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  stripe_account_id: string | null;
  stripe_details_submitted: boolean;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: "admin" | "vendor" | "user";
  tenant_id: number | null;
  status: "active" | "pending" | "blocked";
  email_verified: boolean;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  tenant_id: number;
  category_id: number | null;
  image_url: string | null;
  cover_url: string | null;
  refund_policy: "30-day" | "14-day" | "7-day" | "3-day" | "1-day" | "no-refunds";
  content: string | null;
  is_private: boolean;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: number;
  user_id: number;
  tenant_id: number;
  status: "pending" | "processing" | "completed" | "cancelled" | "refunded";
  total_amount: number;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Review {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  comment: string | null;
  vendor_reply: string | null;
  vendor_replied_at: Date | null;
  is_approved: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  color: string | null;
  parent_id: number | null;
  description: string | null;
  created_at: Date;
}

// ── JWT payload ───────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: number;        // user.id
  email: string;
  role: User["role"];
  tenant_id: number | null;
}

// ── Augmented Express Request ─────────────────────────────────────────────────

export interface AuthRequest extends Request {
  user?: JwtPayload;
  tenantId?: number;
}

// ── API helpers ───────────────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
