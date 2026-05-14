import { Router, Response } from "express";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "../config/db";
import { verifyToken, optionalAuth } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { setTenantContext } from "../middleware/tenant";
import {
  createProductSchema,
  updateProductSchema,
  paginationSchema,
} from "../schemas/index";
import { AuthRequest } from "../types/index";

const router = Router();

// apply tenant resolution to every product route
router.use(setTenantContext);

// ── GET /api/products ─────────────────────────────────────────────────────────
// Public — returns non-archived, non-private products scoped to tenant
router.get("/", optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { page, limit } = paginationSchema.parse(req.query);
  const offset = (page - 1) * limit;

  const { search, category, category_id, min_price, max_price, sort, ids, tenant } = req.query as Record<string, string>;

  const conditions: string[] = ["p.is_archived = 0"];
  const params: unknown[] = [];

  const isAdmin = req.user?.role === "admin";

  if (!isAdmin) conditions.push("p.is_private = 0");

  // Scope to tenant only when a specific tenant is requested (tenant store page)
  const tenantId = req.tenantId ?? (tenant ? null : null);
  if (req.tenantId) {
    conditions.push("p.tenant_id = ?");
    params.push(req.tenantId);
  } else if (tenant) {
    conditions.push("t.slug = ?");
    params.push(tenant);
  }

  if (search) {
    conditions.push("(p.name LIKE ? OR p.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  // Support both category slug and category_id
  if (category) {
    conditions.push("c.slug = ?");
    params.push(category);
  } else if (category_id) {
    conditions.push("p.category_id = ?");
    params.push(Number(category_id));
  }
  if (min_price) {
    conditions.push("p.price >= ?");
    params.push(Number(min_price));
  }
  if (max_price) {
    conditions.push("p.price <= ?");
    params.push(Number(max_price));
  }
  if (ids) {
    const idList = ids.split(",").map(Number).filter(Boolean);
    if (idList.length > 0) {
      conditions.push(`p.id IN (${idList.map(() => "?").join(",")})`);
      params.push(...idList);
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const orderMap: Record<string, string> = {
    newest:     "p.created_at DESC",
    oldest:     "p.created_at ASC",
    price_asc:  "p.price ASC",
    price_desc: "p.price DESC",
    curated:    "p.created_at DESC",
    trending:   "COUNT(DISTINCT r.id) DESC, p.created_at DESC",
    hot_and_new:"p.created_at DESC",
  };
  const orderBy = orderMap[sort ?? "curated"] ?? "p.created_at DESC";

  try {
    const [[{ total }]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM products p
       LEFT JOIN tenants t    ON t.id = p.tenant_id
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}`,
      params
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, t.name AS tenant_name, t.slug AS tenant_slug,
              c.name AS category_name, c.slug AS category_slug,
              COALESCE(AVG(r.rating), 0) AS avg_rating,
              COUNT(DISTINCT r.id) AS review_count
       FROM products p
       LEFT JOIN tenants t    ON t.id = p.tenant_id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN reviews r    ON r.product_id = p.id AND r.is_approved = 1
       ${where}
       GROUP BY p.id
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
});

// ── GET /api/products/:id ─────────────────────────────────────────────────────
router.get("/:id", optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const productId = Number(req.params.id);

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, t.name AS tenant_name, t.slug AS tenant_slug,
              c.name AS category_name, c.slug AS category_slug,
              COALESCE(AVG(r.rating), 0) AS avg_rating,
              COUNT(DISTINCT r.id) AS review_count
       FROM products p
       LEFT JOIN tenants t    ON t.id = p.tenant_id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN reviews r    ON r.product_id = p.id AND r.is_approved = 1
       WHERE p.id = ?
       GROUP BY p.id
       LIMIT 1`,
      [productId]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: "Product not found" });
      return;
    }

    const product = rows[0];

    // Private product: only owner vendor or admin
    if (product.is_private && req.user?.role !== "admin") {
      if (req.user?.role !== "vendor" || req.user.tenant_id !== product.tenant_id) {
        res.status(403).json({ success: false, error: "This product is private" });
        return;
      }
    }

    // Check if the authenticated user has purchased this product
    let isPurchased = false;
    if (req.user?.sub) {
      const [[purchase]] = await pool.query<RowDataPacket[]>(
        `SELECT oi.id FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.user_id = ? AND oi.product_id = ? LIMIT 1`,
        [req.user.sub, productId]
      );
      isPurchased = !!purchase;
    }

    res.json({ success: true, data: { ...product, is_purchased: isPurchased } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch product" });
  }
});

// ── POST /api/products ────────────────────────────────────────────────────────
// Vendor creates a product for their own tenant
router.post(
  "/",
  verifyToken,
  checkRole("admin", "vendor"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const { tag_ids, ...fields } = parsed.data;
    const tenantId = req.user!.role === "admin" ? (req.body.tenant_id ?? req.tenantId) : req.user!.tenant_id;

    if (!tenantId) {
      res.status(400).json({ success: false, error: "Tenant context required to create a product" });
      return;
    }

    // Vendors must activate their store first (skip or connect Stripe)
    if (req.user!.role === "vendor") {
      const [[tenant]] = await pool.query<RowDataPacket[]>(
        "SELECT stripe_details_submitted FROM tenants WHERE id = ? LIMIT 1",
        [tenantId]
      );
      if (!tenant?.stripe_details_submitted) {
        res.status(403).json({
          success: false,
          error: "Complete store setup first. Go to Settings and activate your store.",
        });
        return;
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO products
           (name, description, price, tenant_id, category_id, image_url, cover_url,
            refund_policy, content, is_private)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fields.name,
          fields.description ?? null,
          fields.price,
          tenantId,
          fields.category_id ?? null,
          fields.image_url ?? null,
          fields.cover_url ?? null,
          fields.refund_policy,
          fields.content ?? null,
          fields.is_private ? 1 : 0,
        ]
      );

      const productId = result.insertId;

      if (tag_ids.length > 0) {
        const tagValues = tag_ids.map((tid) => [productId, tid]);
        await conn.query("INSERT IGNORE INTO product_tags (product_id, tag_id) VALUES ?", [tagValues]);
      }

      await conn.commit();

      const [[product]] = await conn.query<RowDataPacket[]>(
        "SELECT * FROM products WHERE id = ? LIMIT 1",
        [productId]
      );

      res.status(201).json({ success: true, data: product });
    } catch (err) {
      await conn.rollback();
      console.error(err);
      res.status(500).json({ success: false, error: "Failed to create product" });
    } finally {
      conn.release();
    }
  }
);

// ── PUT /api/products/:id ─────────────────────────────────────────────────────
router.put(
  "/:id",
  verifyToken,
  checkRole("admin", "vendor"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const productId = Number(req.params.id);
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    try {
      const [[existing]] = await pool.query<RowDataPacket[]>(
        "SELECT id, tenant_id FROM products WHERE id = ? LIMIT 1",
        [productId]
      );
      if (!existing) {
        res.status(404).json({ success: false, error: "Product not found" });
        return;
      }

      // Vendor can only edit their own products
      if (req.user!.role === "vendor" && existing.tenant_id !== req.user!.tenant_id) {
        res.status(403).json({ success: false, error: "You can only edit your own products" });
        return;
      }

      const { tag_ids, ...fields } = parsed.data;
      const setClauses: string[] = [];
      const setParams: unknown[] = [];

      const fieldMap: Record<string, unknown> = {
        name: fields.name,
        description: fields.description,
        price: fields.price,
        category_id: fields.category_id,
        image_url: fields.image_url,
        cover_url: fields.cover_url,
        refund_policy: fields.refund_policy,
        content: fields.content,
        is_private: fields.is_private !== undefined ? (fields.is_private ? 1 : 0) : undefined,
      };

      for (const [key, val] of Object.entries(fieldMap)) {
        if (val !== undefined) {
          setClauses.push(`${key} = ?`);
          setParams.push(val);
        }
      }

      if (setClauses.length > 0) {
        await pool.query(
          `UPDATE products SET ${setClauses.join(", ")} WHERE id = ?`,
          [...setParams, productId]
        );
      }

      if (tag_ids !== undefined) {
        await pool.query("DELETE FROM product_tags WHERE product_id = ?", [productId]);
        if (tag_ids.length > 0) {
          const tagValues = tag_ids.map((tid) => [productId, tid]);
          await pool.query("INSERT IGNORE INTO product_tags (product_id, tag_id) VALUES ?", [tagValues]);
        }
      }

      const [[updated]] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM products WHERE id = ? LIMIT 1",
        [productId]
      );
      res.json({ success: true, data: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: "Failed to update product" });
    }
  }
);

// ── PATCH /api/products/:id/archive ──────────────────────────────────────────
router.patch(
  "/:id/archive",
  verifyToken,
  checkRole("admin", "vendor"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const productId = Number(req.params.id);
    try {
      const [[existing]] = await pool.query<RowDataPacket[]>(
        "SELECT id, tenant_id, is_archived FROM products WHERE id = ? LIMIT 1",
        [productId]
      );
      if (!existing) {
        res.status(404).json({ success: false, error: "Product not found" });
        return;
      }
      if (req.user!.role === "vendor" && existing.tenant_id !== req.user!.tenant_id) {
        res.status(403).json({ success: false, error: "You can only archive your own products" });
        return;
      }
      const newState = existing.is_archived ? 0 : 1;
      await pool.query("UPDATE products SET is_archived = ? WHERE id = ?", [newState, productId]);
      res.json({ success: true, data: { id: productId, is_archived: Boolean(newState) } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: "Failed to toggle archive" });
    }
  }
);

// ── DELETE /api/products/:id ──────────────────────────────────────────────────
// Admin only
router.delete(
  "/:id",
  verifyToken,
  checkRole("admin"),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    const productId = Number(_req.params.id);
    try {
      const [result] = await pool.query<ResultSetHeader>(
        "DELETE FROM products WHERE id = ?",
        [productId]
      );
      if (result.affectedRows === 0) {
        res.status(404).json({ success: false, error: "Product not found" });
        return;
      }
      res.json({ success: true, message: "Product deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: "Failed to delete product" });
    }
  }
);

export default router;
