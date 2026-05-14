import { Router, Request, Response } from "express";
import { RowDataPacket } from "mysql2/promise";
import pool from "../config/db";

const router = Router();

// GET /api/tags — public
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, slug FROM tags ORDER BY name ASC"
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch tags" });
  }
});

export default router;
