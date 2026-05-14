import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/index";

type Role = "admin" | "vendor" | "user";

/**
 * checkRole("admin") — only admins pass
 * checkRole("admin", "vendor") — admins or vendors pass
 */
export function checkRole(...allowedRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      });
      return;
    }

    next();
  };
}
