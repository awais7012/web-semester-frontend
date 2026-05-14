import { Router, Response } from "express";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "../config/db";
import { verifyToken } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { createTenantSchema, updateTenantSchema, paginationSchema } from "../schemas/index";
import { AuthRequest } from "../types/index";

const router = Router();

// ── GET /api/tenants ──────────────────────────────────────────────────────────
router.get("/", verifyToken, checkRole("admin"), async (_req: AuthRequest, res: Response): Promise<void> => {
  const { page, limit } = paginationSchema.parse(_req.query);
  const offset = (page - 1) * limit;

  try {
    const [[{ total }]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM tenants"
    );
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT t.*,
              COUNT(DISTINCT u.id)  AS user_count,
              COUNT(DISTINCT p.id)  AS product_count,
              COUNT(DISTINCT o.id)  AS order_count,
              COALESCE(SUM(o.total_amount), 0) AS total_revenue
       FROM tenants t
       LEFT JOIN users    u ON u.tenant_id = t.id
       LEFT JOIN products p ON p.tenant_id = t.id
       LEFT JOIN orders   o ON o.tenant_id = t.id AND o.status = 'completed'
       GROUP BY t.id
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch tenants" });
  }
});

// ── GET /api/tenants/slug/:slug — public ──────────────────────────────────────
router.get("/slug/:slug", async (req, res: Response): Promise<void> => {
  try {
    const [[tenant]] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, slug, logo_url, description, stripe_details_submitted FROM tenants WHERE slug = ? AND is_active = 1 LIMIT 1",
      [req.params.slug]
    );
    if (!tenant) {
      res.status(404).json({ success: false, error: "Tenant not found" });
      return;
    }
    res.json({ success: true, data: tenant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch tenant" });
  }
});

// ── GET /api/tenants/:id ──────────────────────────────────────────────────────
router.get("/:id", verifyToken, checkRole("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [[tenant]] = await pool.query<RowDataPacket[]>(
      `SELECT t.*,
              COUNT(DISTINCT u.id)  AS user_count,
              COUNT(DISTINCT p.id)  AS product_count,
              COUNT(DISTINCT o.id)  AS order_count,
              COALESCE(SUM(o.total_amount), 0) AS total_revenue
       FROM tenants t
       LEFT JOIN users    u ON u.tenant_id = t.id
       LEFT JOIN products p ON p.tenant_id = t.id
       LEFT JOIN orders   o ON o.tenant_id = t.id AND o.status = 'completed'
       WHERE t.id = ?
       GROUP BY t.id
       LIMIT 1`,
      [Number(req.params.id)]
    );
    if (!tenant) {
      res.status(404).json({ success: false, error: "Tenant not found" });
      return;
    }
    res.json({ success: true, data: tenant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch tenant" });
  }
});

// ── POST /api/tenants ─────────────────────────────────────────────────────────
router.post("/", verifyToken, checkRole("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = createTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const [[dup]] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM tenants WHERE slug = ? LIMIT 1",
      [parsed.data.slug]
    );
    if (dup) {
      res.status(409).json({ success: false, error: "Slug already in use" });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO tenants (name, slug, description, logo_url) VALUES (?, ?, ?, ?)",
      [parsed.data.name, parsed.data.slug, parsed.data.description ?? null, parsed.data.logo_url ?? null]
    );

    const [[tenant]] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM tenants WHERE id = ? LIMIT 1",
      [result.insertId]
    );
    res.status(201).json({ success: true, data: tenant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to create tenant" });
  }
});

// ── PUT /api/tenants/:id ──────────────────────────────────────────────────────
router.put("/:id", verifyToken, checkRole("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = Number(req.params.id);
  const parsed = updateTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  try {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    const { name, slug, description, logo_url } = parsed.data;
    if (name !== undefined)        { setClauses.push("name = ?");        params.push(name); }
    if (slug !== undefined)        { setClauses.push("slug = ?");        params.push(slug); }
    if (description !== undefined) { setClauses.push("description = ?"); params.push(description); }
    if (logo_url !== undefined)    { setClauses.push("logo_url = ?");    params.push(logo_url); }

    if (setClauses.length === 0) {
      res.status(400).json({ success: false, error: "No fields to update" });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE tenants SET ${setClauses.join(", ")} WHERE id = ?`,
      [...params, tenantId]
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, error: "Tenant not found" });
      return;
    }

    const [[updated]] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM tenants WHERE id = ? LIMIT 1",
      [tenantId]
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to update tenant" });
  }
});

// ── DELETE /api/tenants/:id ───────────────────────────────────────────────────
router.delete("/:id", verifyToken, checkRole("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = Number(req.params.id);
  if (tenantId === 1) {
    res.status(400).json({ success: false, error: "Cannot delete the platform tenant" });
    return;
  }

  try {
    const [result] = await pool.query<ResultSetHeader>(
      "DELETE FROM tenants WHERE id = ?",
      [tenantId]
    );
    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, error: "Tenant not found" });
      return;
    }
    res.json({ success: true, message: "Tenant and all associated data deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to delete tenant" });
  }
});

export default router;
