import { Router, Response } from "express";
import { RowDataPacket } from "mysql2/promise";
import pool from "../config/db";
import { verifyToken } from "../middleware/auth";
import { AuthRequest } from "../types/index";

const router = Router();

// All library routes require auth
router.use(verifyToken);

// GET /api/library — returns products the user has purchased (via orders)
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT p.id, p.name, p.image_url, p.description,
              t.slug AS tenant_slug, t.name AS tenant_name,
              COALESCE(AVG(rv.rating), 0) AS avg_rating,
              COUNT(DISTINCT rv.id) AS review_count,
              o.id AS order_id, o.created_at AS purchased_at
       FROM order_items oi
       JOIN orders     o  ON o.id = oi.order_id AND o.user_id = ?
       JOIN products   p  ON p.id = oi.product_id
       JOIN tenants    t  ON t.id = p.tenant_id
       LEFT JOIN reviews rv ON rv.product_id = p.id AND rv.is_approved = 1
       GROUP BY p.id, o.id, o.created_at
       ORDER BY o.created_at DESC`,
      [userId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch library" });
  }
});

// GET /api/library/products/:id — returns product content for a purchased product
router.get("/products/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const productId = Number(req.params.id);

  try {
    // Verify purchase
    const [[purchase]] = await pool.query<RowDataPacket[]>(
      `SELECT oi.id FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.user_id = ? AND oi.product_id = ? LIMIT 1`,
      [userId, productId]
    );

    if (!purchase) {
      res.status(403).json({ success: false, error: "You have not purchased this product" });
      return;
    }

    const [[product]] = await pool.query<RowDataPacket[]>(
      `SELECT p.*, t.name AS tenant_name, t.slug AS tenant_slug,
              c.name AS category_name,
              COALESCE(AVG(r.rating), 0) AS avg_rating,
              COUNT(DISTINCT r.id) AS review_count
       FROM products p
       LEFT JOIN tenants    t ON t.id = p.tenant_id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN reviews    r ON r.product_id = p.id AND r.is_approved = 1
       WHERE p.id = ?
       GROUP BY p.id`,
      [productId]
    );

    if (!product) {
      res.status(404).json({ success: false, error: "Product not found" });
      return;
    }

    // Get my review
    const [[myReview]] = await pool.query<RowDataPacket[]>(
      `SELECT r.*, u.email AS user_email, u.username
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ? AND r.user_id = ? LIMIT 1`,
      [productId, userId]
    );

    res.json({ success: true, data: { ...product, my_review: myReview ?? null, is_purchased: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch product" });
  }
});

export default router;
