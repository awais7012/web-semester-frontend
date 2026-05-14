import { Router, Response } from "express";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "../config/db";
import { verifyToken, optionalAuth } from "../middleware/auth";
import { checkRole } from "../middleware/role";
import { createReviewSchema, replyToReviewSchema, paginationSchema } from "../schemas/index";
import { AuthRequest } from "../types/index";

const router = Router();

// ── GET /api/reviews ──────────────────────────────────────────────────────────
router.get("/", optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { page, limit } = paginationSchema.parse(req.query);
  const offset = (page - 1) * limit;
  const { product_id, rating, is_approved } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (product_id) { conditions.push("r.product_id = ?"); params.push(Number(product_id)); }
  if (rating)     { conditions.push("r.rating = ?");     params.push(Number(rating)); }

  // Non-admins can only see approved reviews
  if (req.user?.role !== "admin") {
    conditions.push("r.is_approved = 1");
  } else if (is_approved !== undefined) {
    conditions.push("r.is_approved = ?");
    params.push(Number(is_approved));
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const [[{ total }]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM reviews r ${where}`,
      params
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT r.*,
              u.username, u.avatar_url,
              p.name AS product_name
       FROM reviews r
       LEFT JOIN users    u ON u.id = r.user_id
       LEFT JOIN products p ON p.id = r.product_id
       ${where}
       ORDER BY r.created_at DESC
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
    res.status(500).json({ success: false, error: "Failed to fetch reviews" });
  }
});

// ── POST /api/reviews ─────────────────────────────────────────────────────────
router.post("/", verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const { product_id, rating, comment } = parsed.data;

  try {
    // Verify product exists
    const [[product]] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM products WHERE id = ? AND is_archived = 0 LIMIT 1",
      [product_id]
    );
    if (!product) {
      res.status(404).json({ success: false, error: "Product not found" });
      return;
    }

    // Check for duplicate review
    const [[dup]] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM reviews WHERE product_id = ? AND user_id = ? LIMIT 1",
      [product_id, req.user!.sub]
    );
    if (dup) {
      res.status(409).json({ success: false, error: "You have already reviewed this product" });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO reviews (product_id, user_id, rating, comment, is_approved)
       VALUES (?, ?, ?, ?, 1)`,
      [product_id, req.user!.sub, rating, comment ?? null]
    );

    const [[review]] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM reviews WHERE id = ? LIMIT 1",
      [result.insertId]
    );
    res.status(201).json({ success: true, data: review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to create review" });
  }
});

// ── PATCH /api/reviews/:id — user updates their own review ───────────────────
router.patch("/:id", verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const reviewId = Number(req.params.id);
  const { rating, comment } = req.body as { rating?: number; comment?: string };

  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ success: false, error: "Rating must be 1–5" });
    return;
  }

  try {
    const [[review]] = await pool.query<RowDataPacket[]>(
      "SELECT id, user_id FROM reviews WHERE id = ? LIMIT 1",
      [reviewId]
    );
    if (!review) {
      res.status(404).json({ success: false, error: "Review not found" });
      return;
    }
    if (review.user_id !== req.user!.sub) {
      res.status(403).json({ success: false, error: "You can only edit your own reviews" });
      return;
    }

    await pool.query(
      "UPDATE reviews SET rating = ?, comment = ? WHERE id = ?",
      [rating, comment ?? null, reviewId]
    );
    const [[updated]] = await pool.query<RowDataPacket[]>(
      `SELECT r.*, u.username, u.email AS user_email FROM reviews r JOIN users u ON u.id = r.user_id WHERE r.id = ? LIMIT 1`,
      [reviewId]
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to update review" });
  }
});

// ── PATCH /api/reviews/:id/reply ─────────────────────────────────────────────
// Vendor can reply to reviews on their products
router.patch(
  "/:id/reply",
  verifyToken,
  checkRole("admin", "vendor"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const reviewId = Number(req.params.id);
    const parsed = replyToReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    try {
      const [[review]] = await pool.query<RowDataPacket[]>(
        `SELECT r.id, p.tenant_id
         FROM reviews r
         JOIN products p ON p.id = r.product_id
         WHERE r.id = ? LIMIT 1`,
        [reviewId]
      );
      if (!review) {
        res.status(404).json({ success: false, error: "Review not found" });
        return;
      }
      if (req.user!.role === "vendor" && review.tenant_id !== req.user!.tenant_id) {
        res.status(403).json({ success: false, error: "You can only reply to reviews on your products" });
        return;
      }

      await pool.query(
        "UPDATE reviews SET vendor_reply = ?, vendor_replied_at = NOW() WHERE id = ?",
        [parsed.data.vendor_reply, reviewId]
      );
      res.json({ success: true, message: "Reply saved" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: "Failed to save reply" });
    }
  }
);

// ── PATCH /api/reviews/:id/approve ───────────────────────────────────────────
router.patch(
  "/:id/approve",
  verifyToken,
  checkRole("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const reviewId = Number(req.params.id);
    const approved = req.body.is_approved === true || req.body.is_approved === 1;
    try {
      const [result] = await pool.query<ResultSetHeader>(
        "UPDATE reviews SET is_approved = ? WHERE id = ?",
        [approved ? 1 : 0, reviewId]
      );
      if (result.affectedRows === 0) {
        res.status(404).json({ success: false, error: "Review not found" });
        return;
      }
      res.json({ success: true, data: { id: reviewId, is_approved: approved } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: "Failed to update review" });
    }
  }
);

// ── DELETE /api/reviews/:id ───────────────────────────────────────────────────
router.delete(
  "/:id",
  verifyToken,
  checkRole("admin"),
  async (_req: AuthRequest, res: Response): Promise<void> => {
    const reviewId = Number(_req.params.id);
    try {
      const [result] = await pool.query<ResultSetHeader>(
        "DELETE FROM reviews WHERE id = ?",
        [reviewId]
      );
      if (result.affectedRows === 0) {
        res.status(404).json({ success: false, error: "Review not found" });
        return;
      }
      res.json({ success: true, message: "Review deleted" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: "Failed to delete review" });
    }
  }
);

export default router;
