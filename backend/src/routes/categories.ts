import { Router, Request, Response } from "express";
import { RowDataPacket } from "mysql2/promise";
import pool from "../config/db";

const router = Router();

// GET /api/categories — public, returns tree with subcategories
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, slug, color, parent_id, description
       FROM categories
       ORDER BY parent_id IS NOT NULL, name ASC`
    );

    // Build tree: root categories with subcategories array
    const roots = rows.filter((r) => !r.parent_id);
    const result = roots.map((root) => ({
      ...root,
      subcategories: rows
        .filter((r) => r.parent_id === root.id)
        .map((sub) => ({ ...sub, subcategories: [] })),
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch categories" });
  }
});

export default router;
