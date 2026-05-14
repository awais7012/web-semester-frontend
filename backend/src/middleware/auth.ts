import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { RowDataPacket } from "mysql2/promise";
import pool from "../config/db";
import { AuthRequest, JwtPayload } from "../types/index";

function extractToken(req: AuthRequest): string | null {
  // httpOnly cookie is primary; Authorization header is fallback
  if (req.cookies?.auth_token) return req.cookies.auth_token as string;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
}

export async function verifyToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ success: false, error: "No token provided" });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ success: false, error: "JWT secret not configured" });
    return;
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, secret) as JwtPayload;
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
    return;
  }

  // Verify the user still exists and is not blocked
  try {
    const [[user]] = await pool.query<RowDataPacket[]>(
      "SELECT status FROM users WHERE id = ? LIMIT 1",
      [payload.sub]
    );
    if (!user) {
      res.status(401).json({ success: false, error: "Account not found" });
      return;
    }
    if (user.status === "blocked") {
      res.status(403).json({ success: false, error: "Your account has been blocked" });
      return;
    }
  } catch {
    // DB check failed — proceed rather than breaking the request
  }

  req.user = payload;
  next();
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) return next();

  const secret = process.env.JWT_SECRET;
  if (!secret) return next();

  try {
    req.user = jwt.verify(token, secret) as JwtPayload;
  } catch {
    // token invalid — continue as unauthenticated
  }
  next();
}
