import { Response, NextFunction } from "express";
import { RowDataPacket } from "mysql2/promise";
import pool from "../config/db";
import { AuthRequest } from "../types/index";

/**
 * Resolves the active tenant from:
 *  1. Subdomain — e.g. "store.funroad.local:3000" → slug "store"
 *  2. X-Tenant-Slug header (useful for API clients / path-based routing)
 *  3. The authenticated user's own tenant_id
 *
 * Sets req.tenantId so downstream handlers can filter with WHERE tenant_id = ?
 */
export async function setTenantContext(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rootDomain = process.env.ROOT_DOMAIN ?? "localhost:3000";
    const host = req.headers.host ?? "";

    // --- subdomain extraction ---
    let slug: string | null = null;

    if (host !== rootDomain && host.endsWith(`.${rootDomain}`)) {
      slug = host.slice(0, -(rootDomain.length + 1)).split(".").pop() ?? null;
    }

    // --- header override (path-based routing fallback) ---
    if (!slug && req.headers["x-tenant-slug"]) {
      slug = String(req.headers["x-tenant-slug"]);
    }

    if (slug) {
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM tenants WHERE slug = ? AND is_active = 1 LIMIT 1",
        [slug]
      );
      if (rows.length > 0) {
        req.tenantId = (rows[0] as { id: number }).id;
      }
    }

    // --- fall back to user's own tenant_id ---
    if (!req.tenantId && req.user?.tenant_id) {
      req.tenantId = req.user.tenant_id;
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Hard-requires a resolved tenantId — use after setTenantContext on
 * routes that are always tenant-scoped.
 */
export function requireTenant(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.tenantId) {
    res.status(400).json({ success: false, error: "Tenant context could not be determined" });
    return;
  }
  next();
}
