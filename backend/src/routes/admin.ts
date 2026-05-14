/**
 * Admin Analytics Routes
 * All endpoints require role = 'admin'
 */
import { Router, Response } from "express";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "../config/db";
import { verifyToken } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { AuthRequest } from "../types/index";
import { sendVendorApprovedEmail, sendVendorRejectedEmail } from "../config/email";

const router = Router();
router.use(verifyToken, checkRole("admin"));

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
// KPI cards: total users, products, orders, revenue
router.get("/stats", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [[stats]] = await pool.query<RowDataPacket[]>(`
      SELECT
        (SELECT COUNT(*) FROM users)    AS total_users,
        (SELECT COUNT(*) FROM products) AS total_products,
        (SELECT COUNT(*) FROM orders)   AS total_orders,
        (SELECT COUNT(*) FROM tenants)  AS total_tenants,
        COALESCE(
          (SELECT SUM(total_amount) FROM orders WHERE status = 'completed'), 0
        )                               AS total_revenue,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending')    AS pending_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'completed')  AS completed_orders,
        (SELECT COUNT(*) FROM users WHERE role = 'vendor')        AS total_vendors,
        (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS new_users_30d,
        COALESCE(
          (SELECT SUM(total_amount) FROM orders
           WHERE status = 'completed' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)), 0
        )                               AS revenue_30d
    `);

    res.json({ success: true, data: stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch stats" });
  }
});

// ── GET /api/admin/revenue-chart ──────────────────────────────────────────────
// Daily revenue for last N days (default 30)
router.get("/revenue-chart", async (req: AuthRequest, res: Response): Promise<void> => {
  const days = Math.min(365, Math.max(7, Number(req.query.days ?? 30)));

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         DATE(created_at) AS date,
         COUNT(*)          AS order_count,
         SUM(total_amount) AS revenue
       FROM orders
       WHERE status = 'completed'
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch revenue chart" });
  }
});

// ── GET /api/admin/orders-by-status ──────────────────────────────────────────
// Pie chart data
router.get("/orders-by-status", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT status, COUNT(*) AS count FROM orders GROUP BY status`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch order status data" });
  }
});

// ── GET /api/admin/top-products ───────────────────────────────────────────────
router.get("/top-products", async (req: AuthRequest, res: Response): Promise<void> => {
  const limit = Math.min(20, Number(req.query.limit ?? 10));

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         p.id, p.name, p.price, p.image_url,
         t.name  AS tenant_name,
         t.slug  AS tenant_slug,
         SUM(oi.quantity)       AS total_sold,
         SUM(oi.subtotal)       AS total_revenue,
         COALESCE(AVG(r.rating), 0) AS avg_rating,
         COUNT(DISTINCT r.id)   AS review_count
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders      o  ON o.id = oi.order_id AND o.status = 'completed'
       LEFT JOIN reviews     r  ON r.product_id = p.id AND r.is_approved = 1
       LEFT JOIN tenants     t  ON t.id = p.tenant_id
       GROUP BY p.id
       ORDER BY total_revenue DESC
       LIMIT ?`,
      [limit]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch top products" });
  }
});

// ── GET /api/admin/recent-orders ──────────────────────────────────────────────
router.get("/recent-orders", async (req: AuthRequest, res: Response): Promise<void> => {
  const limit = Math.min(50, Number(req.query.limit ?? 10));

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT o.*,
              u.username, u.email,
              t.name AS tenant_name, t.slug AS tenant_slug
       FROM orders o
       LEFT JOIN users   u ON u.id = o.user_id
       LEFT JOIN tenants t ON t.id = o.tenant_id
       ORDER BY o.created_at DESC
       LIMIT ?`,
      [limit]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch recent orders" });
  }
});

// ── GET /api/admin/user-growth ────────────────────────────────────────────────
// New users per month for last 12 months
router.get("/user-growth", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        COUNT(*)                          AS new_users
      FROM users
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch user growth" });
  }
});

// ── GET /api/admin/tenant-performance ────────────────────────────────────────
router.get("/tenant-performance", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT
        t.id, t.name, t.slug, t.logo_url,
        COUNT(DISTINCT p.id)  AS product_count,
        COUNT(DISTINCT o.id)  AS order_count,
        COALESCE(SUM(o.total_amount), 0) AS revenue
      FROM tenants t
      LEFT JOIN products p ON p.tenant_id = t.id
      LEFT JOIN orders   o ON o.tenant_id = t.id AND o.status = 'completed'
      GROUP BY t.id
      ORDER BY revenue DESC
    `);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch tenant performance" });
  }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get("/users", async (req: AuthRequest, res: Response): Promise<void> => {
  const page  = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Number(req.query.limit ?? 20));
  const offset = (page - 1) * limit;

  const { role, status, search } = req.query as Record<string, string>;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (role)   { conditions.push("u.role = ?");   params.push(role); }
  if (status) { conditions.push("u.status = ?"); params.push(status); }
  if (search) {
    conditions.push("(u.email LIKE ? OR u.username LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const [[{ total }]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM users u ${where}`,
      params
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.email, u.role, u.status,
              u.email_verified, u.avatar_url, u.created_at,
              t.name AS tenant_name, t.slug AS tenant_slug
       FROM users u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       ${where}
       ORDER BY u.created_at DESC
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
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

// ── PATCH /api/admin/users/:id/role ──────────────────────────────────────────
router.patch("/users/:id/role", async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = Number(req.params.id);
  const { role, status } = req.body as { role?: string; status?: string };

  const allowed_roles   = ["admin", "vendor", "user"];
  const allowed_statuses = ["active", "pending", "blocked"];

  if (role && !allowed_roles.includes(role)) {
    res.status(400).json({ success: false, error: "Invalid role" });
    return;
  }
  if (status && !allowed_statuses.includes(status)) {
    res.status(400).json({ success: false, error: "Invalid status" });
    return;
  }

  try {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    if (role)   { setClauses.push("role = ?");   params.push(role); }
    if (status) { setClauses.push("status = ?"); params.push(status); }

    if (setClauses.length === 0) {
      res.status(400).json({ success: false, error: "Nothing to update" });
      return;
    }

    // Fetch user before update to check if this is a vendor approval
    const [[userBefore]] = await pool.query<RowDataPacket[]>(
      "SELECT email, username, role, status FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    await pool.query(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`,
      [...params, userId]
    );

    // When admin approves a pending vendor → activate tenant + send approval email
    if (
      userBefore &&
      userBefore.role === "vendor" &&
      userBefore.status === "pending" &&
      status === "active"
    ) {
      await pool.query(
        "UPDATE tenants t JOIN users u ON u.tenant_id = t.id SET t.is_active = 1 WHERE u.id = ?",
        [userId]
      );
      sendVendorApprovedEmail(userBefore.email, userBefore.username).catch(console.error);
    }

    // When admin blocks a pending vendor → downgrade to user, deactivate tenant, send rejection email
    if (
      userBefore &&
      userBefore.role === "vendor" &&
      userBefore.status === "pending" &&
      status === "blocked"
    ) {
      await pool.query("UPDATE users SET role = 'user' WHERE id = ?", [userId]);
      await pool.query(
        "UPDATE tenants t JOIN users u ON u.tenant_id = t.id SET t.is_active = 0 WHERE u.id = ?",
        [userId]
      );
      sendVendorRejectedEmail(userBefore.email, userBefore.username).catch(console.error);
    }

    res.json({ success: true, message: "User updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to update user" });
  }
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
router.delete("/users/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = Number(req.params.id);
  if (userId === req.user!.sub) {
    res.status(400).json({ success: false, error: "You cannot delete your own account" });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Get tenant_id before deletion
    const [[userRow]] = await conn.query<RowDataPacket[]>(
      "SELECT tenant_id FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    if (!userRow) {
      await conn.rollback();
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    // Delete reviews written by this user
    await conn.query("DELETE FROM reviews WHERE user_id = ?", [userId]);

    // Delete orders placed by this user (and their items)
    const [userOrders] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM orders WHERE user_id = ?",
      [userId]
    );
    if ((userOrders as RowDataPacket[]).length > 0) {
      const orderIds = (userOrders as RowDataPacket[]).map((o) => o.id);
      await conn.query("DELETE FROM order_items WHERE order_id IN (?)", [orderIds]);
      await conn.query("DELETE FROM orders WHERE user_id = ?", [userId]);
    }

    // Deactivate vendor tenant (keep it for sold-order records, just deactivate)
    if (userRow.tenant_id) {
      await conn.query("UPDATE tenants SET is_active = 0 WHERE id = ?", [userRow.tenant_id]);
    }

    await conn.query<ResultSetHeader>("DELETE FROM users WHERE id = ?", [userId]);
    await conn.commit();

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to delete user" });
  } finally {
    conn.release();
  }
});

export default router;
