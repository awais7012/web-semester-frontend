import { Router, Response } from "express";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "../config/db";
import { verifyToken } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { setTenantContext } from "../middleware/tenant";
import { createOrderSchema, updateOrderStatusSchema, paginationSchema } from "../schemas/index";
import { AuthRequest } from "../types/index";

const router = Router();
router.use(verifyToken, setTenantContext);

// ── GET /api/orders ───────────────────────────────────────────────────────────
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const { page, limit } = paginationSchema.parse(req.query);
  const offset = (page - 1) * limit;
  const { status, tenant_id: qTenant } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (req.user!.role === "user") {
    // Regular users see only their own orders
    conditions.push("o.user_id = ?");
    params.push(req.user!.sub);
  } else if (req.user!.role === "vendor") {
    // Vendors see orders within their tenant
    conditions.push("o.tenant_id = ?");
    params.push(req.user!.tenant_id);
  } else if (req.user!.role === "admin") {
    // Admins can filter by tenant
    if (qTenant) {
      conditions.push("o.tenant_id = ?");
      params.push(Number(qTenant));
    }
  }

  if (status) {
    conditions.push("o.status = ?");
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const [[{ total }]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM orders o ${where}`,
      params
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT o.*,
              u.username AS buyer_username, u.email AS buyer_email,
              t.name AS tenant_name, t.slug AS tenant_slug,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count,
              (SELECT p.name FROM order_items oi2
               JOIN products p ON p.id = oi2.product_id
               WHERE oi2.order_id = o.id LIMIT 1) AS first_product_name
       FROM orders o
       LEFT JOIN users   u ON u.id = o.user_id
       LEFT JOIN tenants t ON t.id = o.tenant_id
       ${where}
       ORDER BY o.created_at DESC
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
    res.status(500).json({ success: false, error: "Failed to fetch orders" });
  }
});

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const orderId = Number(req.params.id);
  try {
    const [[order]] = await pool.query<RowDataPacket[]>(
      `SELECT o.*,
              u.username AS buyer_username, u.email AS buyer_email,
              t.name AS tenant_name, t.slug AS tenant_slug
       FROM orders o
       LEFT JOIN users   u ON u.id = o.user_id
       LEFT JOIN tenants t ON t.id = o.tenant_id
       WHERE o.id = ? LIMIT 1`,
      [orderId]
    );

    if (!order) {
      res.status(404).json({ success: false, error: "Order not found" });
      return;
    }

    // Access control
    const { role, sub, tenant_id } = req.user!;
    if (role === "user" && order.user_id !== sub) {
      res.status(403).json({ success: false, error: "Access denied" });
      return;
    }
    if (role === "vendor" && order.tenant_id !== tenant_id) {
      res.status(403).json({ success: false, error: "Access denied" });
      return;
    }

    // Load items
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT oi.*, p.name AS product_name, p.image_url
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    res.json({ success: true, data: { ...order, items } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch order" });
  }
});

// ── POST /api/orders ──────────────────────────────────────────────────────────
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  if (!req.tenantId) {
    res.status(400).json({ success: false, error: "Tenant context required" });
    return;
  }

  const { product_ids, notes } = parsed.data;
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Fetch products and verify they belong to the same tenant
    const ids = product_ids.map((p) => p.product_id);
    const [products] = await conn.query<RowDataPacket[]>(
      `SELECT id, price, tenant_id, is_archived FROM products WHERE id IN (?) AND tenant_id = ?`,
      [ids, req.tenantId]
    );

    if (products.length !== ids.length) {
      await conn.rollback();
      res.status(400).json({ success: false, error: "One or more products are invalid or unavailable" });
      return;
    }

    const priceMap: Record<number, number> = {};
    for (const p of products as Array<{ id: number; price: number; is_archived: number }>) {
      if (p.is_archived) {
        await conn.rollback();
        res.status(400).json({ success: false, error: `Product #${p.id} is archived` });
        return;
      }
      priceMap[p.id] = p.price;
    }

    let total = 0;
    for (const item of product_ids) total += priceMap[item.product_id] * item.quantity;

    const [orderResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO orders (user_id, tenant_id, total_amount, notes)
       VALUES (?, ?, ?, ?)`,
      [req.user!.sub, req.tenantId, total, notes ?? null]
    );
    const orderId = orderResult.insertId;

    const itemRows = product_ids.map((item) => [orderId, item.product_id, item.quantity, priceMap[item.product_id]]);
    await conn.query(
      "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ?",
      [itemRows]
    );

    await conn.commit();

    const [[newOrder]] = await conn.query<RowDataPacket[]>(
      "SELECT * FROM orders WHERE id = ? LIMIT 1",
      [orderId]
    );
    res.status(201).json({ success: true, data: newOrder });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to create order" });
  } finally {
    conn.release();
  }
});

// ── PATCH /api/orders/:id/status ──────────────────────────────────────────────
router.patch(
  "/:id/status",
  checkRole("admin", "vendor"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const orderId = Number(req.params.id);
    const parsed = updateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    try {
      const [[existing]] = await pool.query<RowDataPacket[]>(
        "SELECT id, tenant_id FROM orders WHERE id = ? LIMIT 1",
        [orderId]
      );
      if (!existing) {
        res.status(404).json({ success: false, error: "Order not found" });
        return;
      }
      if (req.user!.role === "vendor" && existing.tenant_id !== req.user!.tenant_id) {
        res.status(403).json({ success: false, error: "Access denied" });
        return;
      }

      await pool.query("UPDATE orders SET status = ? WHERE id = ?", [parsed.data.status, orderId]);
      res.json({ success: true, data: { id: orderId, status: parsed.data.status } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: "Failed to update order status" });
    }
  }
);

export default router;
