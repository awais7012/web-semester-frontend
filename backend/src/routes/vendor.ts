import Stripe from "stripe";
import { Router, Response } from "express";
import { RowDataPacket } from "mysql2/promise";
import pool from "../config/db";
import { verifyToken } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { AuthRequest } from "../types/index";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const router = Router();
router.use(verifyToken, checkRole("vendor", "admin"));

// GET /api/vendor/stats — stats for the authenticated vendor's tenant
router.get("/stats", async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user!.tenant_id;
  if (!tenantId) {
    res.status(400).json({ success: false, error: "No tenant associated with this account" });
    return;
  }

  try {
    const [[stats]] = await pool.query<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(*) FROM products WHERE tenant_id = ? AND is_archived = 0) AS product_count,
         (SELECT COUNT(*) FROM orders   WHERE tenant_id = ?)                     AS order_count,
         COALESCE(
           (SELECT SUM(total_amount) FROM orders WHERE tenant_id = ? AND status = 'completed'), 0
         )                                                                        AS total_revenue,
         (SELECT COUNT(*) FROM orders WHERE tenant_id = ? AND status = 'pending') AS pending_orders`,
      [tenantId, tenantId, tenantId, tenantId]
    );

    res.json({ success: true, data: stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch vendor stats" });
  }
});

// GET /api/vendor/store — tenant info for the logged-in vendor
router.get("/store", async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user!.tenant_id;
  if (!tenantId) {
    res.status(400).json({ success: false, error: "No tenant associated" });
    return;
  }

  try {
    const [[tenant]] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM tenants WHERE id = ? LIMIT 1",
      [tenantId]
    );
    const [[user]] = await pool.query<RowDataPacket[]>(
      "SELECT id, username, email FROM users WHERE id = ? LIMIT 1",
      [req.user!.sub]
    );

    res.json({ success: true, data: { tenant, username: user?.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch store" });
  }
});

// GET /api/vendor/products — vendor's own products
router.get("/products", async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user!.tenant_id;
  if (!tenantId) {
    res.status(400).json({ success: false, error: "No tenant associated" });
    return;
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.tenant_id = ?
       ORDER BY p.created_at DESC`,
      [tenantId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
});

// GET /api/vendor/reviews — reviews for all of the vendor's products
router.get("/reviews", async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user!.tenant_id;
  if (!tenantId) {
    res.status(400).json({ success: false, error: "No tenant associated" });
    return;
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT r.*, u.username, u.email AS user_email, p.name AS product_name
       FROM reviews r
       JOIN products p ON p.id = r.product_id AND p.tenant_id = ?
       JOIN users    u ON u.id = r.user_id
       ORDER BY r.created_at DESC`,
      [tenantId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch reviews" });
  }
});

// GET /api/vendor/analytics — revenue chart, order breakdown, top products
router.get("/analytics", async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user!.tenant_id;
  if (!tenantId) {
    res.status(400).json({ success: false, error: "No tenant associated" });
    return;
  }
  try {
    const [revenueChart] = await pool.query<RowDataPacket[]>(
      `SELECT DATE(created_at) AS date,
              COUNT(*) AS order_count,
              COALESCE(SUM(total_amount), 0) AS revenue
       FROM orders
       WHERE tenant_id = ? AND status NOT IN ('cancelled')
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [tenantId]
    );

    const [ordersByStatus] = await pool.query<RowDataPacket[]>(
      `SELECT status, COUNT(*) AS count FROM orders WHERE tenant_id = ? GROUP BY status`,
      [tenantId]
    );

    const [topProducts] = await pool.query<RowDataPacket[]>(
      `SELECT p.id, p.name, p.price, p.image_url,
              COUNT(oi.id) AS total_sold,
              COALESCE(SUM(oi.unit_price * oi.quantity), 0) AS revenue
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o ON o.id = oi.order_id AND o.tenant_id = ? AND o.status NOT IN ('cancelled')
       WHERE p.tenant_id = ?
       GROUP BY p.id, p.name, p.price, p.image_url
       ORDER BY revenue DESC
       LIMIT 5`,
      [tenantId, tenantId]
    );

    res.json({ success: true, data: { revenue_chart: revenueChart, orders_by_status: ordersByStatus, top_products: topProducts } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch analytics" });
  }
});

// PATCH /api/vendor/mark-verified — mark stripe as submitted + activate tenant
router.patch("/mark-verified", async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user!.tenant_id;
  if (!tenantId) {
    res.status(400).json({ success: false, error: "No tenant associated" });
    return;
  }

  try {
    await pool.query(
      "UPDATE tenants SET stripe_details_submitted = 1, is_active = 1 WHERE id = ?",
      [tenantId]
    );
    const [[tenant]] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM tenants WHERE id = ? LIMIT 1",
      [tenantId]
    );
    res.json({ success: true, data: tenant });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to update verification" });
  }
});

// POST /api/vendor/stripe/connect-link — create Stripe Connect onboarding link
router.post("/stripe/connect-link", async (req: AuthRequest, res: Response): Promise<void> => {
  const tenantId = req.user!.tenant_id;
  if (!tenantId) {
    res.status(400).json({ success: false, error: "No tenant associated" });
    return;
  }

  try {
    const [[tenant]] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM tenants WHERE id = ? LIMIT 1",
      [tenantId]
    );

    let accountId: string = tenant.stripe_account_id;

    // Create a new Express account if vendor doesn't have one yet
    if (!accountId) {
      const account = await stripe.accounts.create({ type: "express" });
      accountId = account.id;
      await pool.query(
        "UPDATE tenants SET stripe_account_id = ? WHERE id = ?",
        [accountId, tenantId]
      );
    }

    const origin = process.env.ROOT_DOMAIN
      ? `http://${process.env.ROOT_DOMAIN}`
      : "http://localhost:3000";

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/vendor/settings`,
      return_url: `${origin}/stripe-verify`,
      type: "account_onboarding",
    });

    res.json({ success: true, data: { url: accountLink.url } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to create Stripe Connect link" });
  }
});

export default router;
