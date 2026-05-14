"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

// ── Image upload ──────────────────────────────────────────────────────────────

export async function uploadImage(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const json = await res.json() as { success: boolean; data?: { url: string }; error?: string };
  if (!json.success) return { success: false, error: json.error };
  return { success: true, url: json.data?.url };
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
// Token is stored ONLY in an httpOnly cookie set by the backend.
// We never store the raw JWT in localStorage to prevent XSS token theft.
// We do store a non-sensitive user object (role, username) for fast UI rendering.


export function clearToken(): void {
  localStorage.removeItem("auth_user");
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

export function setStoredUser(user: AuthUser): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_user", JSON.stringify(user));
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: "admin" | "vendor" | "user";
  tenant_id: number | null;
  status: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit & { tenantSlug?: string } = {}
): Promise<ApiResponse<T>> {
  const { tenantSlug, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };
  // Auth is handled entirely by the httpOnly cookie sent automatically via credentials: "include"
  if (tenantSlug) headers["X-Tenant-Slug"] = tenantSlug;

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    credentials: "include",
  });
  const json = (await response.json()) as ApiResponse<T>;

  // Auth endpoints return 401/403 legitimately — don't auto-redirect
  if (!path.startsWith("/auth/")) {
    if (response.status === 401) {
      clearToken();
      if (typeof window !== "undefined") window.location.href = "/sign-in";
    }
    if (response.status === 403 && (json as ApiResponse).error?.toLowerCase().includes("blocked")) {
      clearToken();
      if (typeof window !== "undefined") window.location.href = "/sign-in";
    }
  }

  return json;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (body: { username: string; email: string; password: string; role?: string; storeName?: string }) =>
    apiFetch<{ token: string; user: AuthUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    apiFetch<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  me: () => apiFetch<AuthUser>("/auth/me"),
  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    apiFetch<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  verifyEmail: (token: string) =>
    apiFetch<{ message: string }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  verifyOtp: (email: string, otp: string) =>
    apiFetch<{ token: string; user: AuthUser }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    }),
  resendOtp: (email: string) =>
    apiFetch<{ message: string }>("/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
};

// ── Product type ──────────────────────────────────────────────────────────────

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  refund_policy: string;
  is_archived: boolean;
  is_private: boolean;
  tenant_id: number;
  tenant_name: string;
  tenant_slug: string;
  category_id: number | null;
  category_name: string | null;
  avg_rating: number;
  review_count: number;
  created_at: string;
}

export interface ProductDetail extends Product {
  tags: Array<{ id: number; name: string; slug: string }>;
  reviews: Array<{
    id: number;
    rating: number;
    comment: string | null;
    vendor_reply: string | null;
    is_approved: boolean;
    created_at: string;
    user_email: string;
    username: string;
  }>;
  rating_distribution: Record<string, number>;
  is_purchased: boolean;
}

export interface PaginatedProducts {
  data: Product[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ── Products ──────────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<Product[]>(`/products${qs}`);
  },
  get: (id: number | string, tenantSlug?: string) =>
    apiFetch<ProductDetail>(`/products/${id}`, tenantSlug ? { tenantSlug } : {}),
  create: (body: unknown) =>
    apiFetch<Product>("/products", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: unknown) =>
    apiFetch<Product>(`/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  archive: (id: number) =>
    apiFetch<Product>(`/products/${id}/archive`, { method: "PATCH" }),
  delete: (id: number) =>
    apiFetch<unknown>(`/products/${id}`, { method: "DELETE" }),
};

// ── Order type ────────────────────────────────────────────────────────────────

export interface Order {
  id: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "completed";
  total_amount: number;
  phone: string | null;
  shipping_address: string | null;
  notes: string | null;
  created_at: string;
  buyer_email: string;
  buyer_username: string;
  items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    image_url: string | null;
    tenant_slug: string;
  }>;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export const ordersApi = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<Order[]>(`/orders${qs}`);
  },
  get: (id: number) => apiFetch<Order>(`/orders/${id}`),
  create: (body: unknown) =>
    apiFetch<Order>("/orders", { method: "POST", body: JSON.stringify(body) }),
  updateStatus: (id: number, status: string) =>
    apiFetch<Order>(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

// ── Review type ───────────────────────────────────────────────────────────────

export interface Review {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  comment: string | null;
  vendor_reply: string | null;
  is_approved: boolean;
  created_at: string;
  user_email: string;
  username: string;
  product_name?: string;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export const reviewsApi = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<Review[]>(`/reviews${qs}`);
  },
  create: (body: { product_id: number; rating: number; comment?: string }) =>
    apiFetch<Review>("/reviews", { method: "POST", body: JSON.stringify(body) }),
  update: (id: number, body: { rating: number; comment?: string }) =>
    apiFetch<Review>(`/reviews/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  reply: (id: number, vendor_reply: string) =>
    apiFetch<Review>(`/reviews/${id}/reply`, { method: "PATCH", body: JSON.stringify({ vendor_reply }) }),
  approve: (id: number, is_approved: boolean) =>
    apiFetch<Review>(`/reviews/${id}/approve`, { method: "PATCH", body: JSON.stringify({ is_approved }) }),
  delete: (id: number) =>
    apiFetch<unknown>(`/reviews/${id}`, { method: "DELETE" }),
};

// ── Library (purchased products) ─────────────────────────────────────────────

export interface LibraryProduct {
  id: number;
  name: string;
  image_url: string | null;
  tenant_slug: string;
  tenant_name: string;
  avg_rating: number;
  review_count: number;
  order_id: number;
  purchased_at: string;
}

export interface LibraryProductDetail extends ProductDetail {
  my_review: Review | null;
}

export const libraryApi = {
  list: (params?: Record<string, string | number>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<LibraryProduct[]>(`/library${qs}`);
  },
  getProduct: (productId: number | string) =>
    apiFetch<LibraryProductDetail>(`/library/products/${productId}`),
};

// ── Checkout ──────────────────────────────────────────────────────────────────

export const checkoutApi = {
  getProducts: (ids: string[], tenantSlug: string) =>
    apiFetch<Product[]>(`/products?ids=${ids.join(",")}&limit=50`, { tenantSlug }),
  createSession: (
    body: { product_ids: Array<{ product_id: number; quantity: number }>; phone?: string; address?: string },
    tenantSlug: string
  ) =>
    apiFetch<{ url: string }>("/checkout/session", {
      method: "POST",
      body: JSON.stringify(body),
      tenantSlug,
    }),
  verifySession: (sessionId: string, tenantSlug: string) =>
    apiFetch<{ orderId: number }>("/checkout/verify", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
      tenantSlug,
    }),
};

// ── Tags ──────────────────────────────────────────────────────────────────────

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export const tagsApi = {
  list: () => apiFetch<Tag[]>("/tags"),
};

// ── Admin analytics ───────────────────────────────────────────────────────────

export const adminApi = {
  stats: () => apiFetch<AdminStats>("/admin/stats"),
  revenueChart: (days = 30) => apiFetch<RevenuePoint[]>(`/admin/revenue-chart?days=${days}`),
  ordersByStatus: () => apiFetch<StatusCount[]>("/admin/orders-by-status"),
  topProducts: (limit = 10) => apiFetch<TopProduct[]>(`/admin/top-products?limit=${limit}`),
  recentOrders: (limit = 10) => apiFetch<unknown[]>(`/admin/recent-orders?limit=${limit}`),
  userGrowth: () => apiFetch<GrowthPoint[]>("/admin/user-growth"),
  tenantPerformance: () => apiFetch<TenantPerf[]>("/admin/tenant-performance"),
  users: (params?: Record<string, string | number>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<unknown[]>(`/admin/users${qs}`);
  },
  updateUserRole: (id: number, body: { role?: string; status?: string }) =>
    apiFetch<unknown>(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteUser: (id: number) =>
    apiFetch<unknown>(`/admin/users/${id}`, { method: "DELETE" }),
};

export interface AdminStats {
  total_users: number;
  total_products: number;
  total_orders: number;
  total_tenants: number;
  total_revenue: number;
  pending_orders: number;
  completed_orders: number;
  total_vendors: number;
  new_users_30d: number;
  revenue_30d: number;
}

export interface RevenuePoint {
  date: string;
  order_count: number;
  revenue: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface TopProduct {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
  tenant_name: string;
  total_sold: number;
  total_revenue: number;
  avg_rating: number;
}

export interface GrowthPoint {
  month: string;
  new_users: number;
}

export interface TenantPerf {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  product_count: number;
  order_count: number;
  revenue: number;
}

// ── Categories ────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  slug: string;
  color: string | null;
  parent_id: number | null;
  description: string | null;
  subcategories: Category[];
}

export const categoriesApi = {
  list: () => apiFetch<Category[]>("/categories"),
};

// ── Tenant ────────────────────────────────────────────────────────────────────

export interface TenantInfo {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  stripe_details_submitted: boolean;
}

export const tenantsApi = {
  getOne: (slug: string) => apiFetch<TenantInfo>(`/tenants/slug/${slug}`),
};

// ── Vendor ────────────────────────────────────────────────────────────────────

export interface VendorStats {
  product_count: number;
  order_count: number;
  total_revenue: number;
  pending_orders: number;
}

export interface VendorStore {
  tenant: {
    id: number;
    name: string;
    slug: string;
    stripe_details_submitted: boolean;
    logo_url: string | null;
  };
  username: string;
}

export interface VendorProduct {
  id: number;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  is_archived: boolean;
  category_id: number | null;
  category_name: string | null;
  refund_policy: string;
  created_at: string;
}

export interface VendorAnalytics {
  revenue_chart: Array<{ date: string; order_count: number; revenue: number }>;
  orders_by_status: Array<{ status: string; count: number }>;
  top_products: Array<{ id: number; name: string; price: number; image_url: string | null; total_sold: number; revenue: number }>;
}

export const vendorApi = {
  stats: () => apiFetch<VendorStats>("/vendor/stats"),
  analytics: () => apiFetch<VendorAnalytics>("/vendor/analytics"),
  store: () => apiFetch<VendorStore>("/vendor/store"),
  products: (params?: Record<string, string | number>) => {
    const qs = params ? "?" + new URLSearchParams(params as Record<string, string>).toString() : "";
    return apiFetch<VendorProduct[]>(`/vendor/products${qs}`);
  },
  createProduct: (body: unknown) =>
    apiFetch<VendorProduct>("/products", { method: "POST", body: JSON.stringify(body) }),
  toggleArchive: (id: number) =>
    apiFetch<VendorProduct>(`/products/${id}/archive`, { method: "PATCH" }),
  markVerified: () =>
    apiFetch<VendorStore["tenant"]>("/vendor/mark-verified", { method: "PATCH" }),
  stripeConnectLink: () =>
    apiFetch<{ url: string }>("/vendor/stripe/connect-link", { method: "POST" }),
  reviews: () => apiFetch<Review[]>("/vendor/reviews"),
  updateProduct: (id: number, body: unknown) =>
    apiFetch<VendorProduct>(`/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProduct: (id: number) =>
    apiFetch<unknown>(`/products/${id}`, { method: "DELETE" }),
};
