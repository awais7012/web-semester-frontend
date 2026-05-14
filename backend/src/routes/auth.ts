import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "../config/db";
import { verifyToken } from "../middleware/auth";
import { loginSchema, registerSchema } from "../schemas/index";
import { AuthRequest, JwtPayload, User } from "../types/index";
import { sendOTPEmail } from "../config/email";

const router = Router();

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const { username, email, password, role, storeName } = parsed.data;

  try {
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id, status FROM users WHERE email = ? OR username = ? LIMIT 1",
      [email, username]
    );
    if (existing.length > 0) {
      const existingUser = existing[0] as { id: number; status: string };
      if (existingUser.status === "blocked") {
        res.status(403).json({ success: false, error: "This email is not allowed to register. Contact support." });
      } else {
        res.status(409).json({ success: false, error: "Email or username already in use" });
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Vendors start pending (need admin approval after email verify)
    const initialStatus = role === "vendor" ? "pending" : "active";

    // Auto-create tenant for vendors
    let tenantId: number | null = null;
    if (role === "vendor") {
      const slug = username.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const name = storeName ?? `${username}'s Store`;

      // Ensure slug is unique
      const [[slugCheck]] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM tenants WHERE slug = ? LIMIT 1",
        [slug]
      );
      const finalSlug = slugCheck ? `${slug}-${Date.now()}` : slug;

      const [tenantResult] = await pool.query<ResultSetHeader>(
        "INSERT INTO tenants (name, slug, is_active) VALUES (?, ?, 0)",
        [name, finalSlug]
      );
      tenantId = tenantResult.insertId;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (username, email, password_hash, role, tenant_id, status, email_verified, email_verification_token, email_verification_expiry)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [username, email, passwordHash, role ?? "user", tenantId, initialStatus, otp, expiry]
    );

    // Always log OTP to console — visible in backend terminal when email fails
    console.log(`\n📧 OTP for ${email}: ${otp}\n`);

    // Send OTP email (non-blocking — don't fail registration if email fails)
    sendOTPEmail(email, username, otp).catch((err) =>
      console.error("Failed to send OTP email:", err)
    );

    res.status(201).json({
      success: true,
      requiresOTP: true,
      data: { userId: result.insertId, email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Registration failed" });
  }
});

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
router.post("/verify-otp", async (req: Request, res: Response): Promise<void> => {
  const { email, otp } = req.body as { email?: string; otp?: string };
  if (!email || !otp) {
    res.status(400).json({ success: false, error: "Email and OTP are required" });
    return;
  }

  try {
    const [[user]] = await pool.query<RowDataPacket[]>(
      `SELECT id, username, email, role, tenant_id, status, email_verification_token, email_verification_expiry
       FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    const isDevBypass = process.env.NODE_ENV !== "production" && otp === "000000";

    if (!isDevBypass && user.email_verification_token !== otp) {
      res.status(400).json({ success: false, error: "Invalid OTP" });
      return;
    }

    if (!isDevBypass && new Date(user.email_verification_expiry) < new Date()) {
      res.status(400).json({ success: false, error: "OTP has expired. Please request a new one." });
      return;
    }

    // Mark email as verified, clear OTP
    await pool.query(
      "UPDATE users SET email_verified = 1, email_verification_token = NULL, email_verification_expiry = NULL WHERE id = ?",
      [user.id]
    );

    // Vendors need admin approval next — return their info but no token yet if still pending
    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
    });

    setAuthCookie(res, token);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          tenant_id: user.tenant_id,
          status: user.status,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "OTP verification failed" });
  }
});

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────────
router.post("/resend-otp", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ success: false, error: "Email required" });
    return;
  }

  try {
    const [[user]] = await pool.query<RowDataPacket[]>(
      "SELECT id, username, email_verified FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    if (user.email_verified) {
      res.status(400).json({ success: false, error: "Email already verified" });
      return;
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      "UPDATE users SET email_verification_token = ?, email_verification_expiry = ? WHERE id = ?",
      [otp, expiry, user.id]
    );

    console.log(`\n📧 OTP (resend) for ${email}: ${otp}\n`);
    sendOTPEmail(email, user.username, otp).catch((err) =>
      console.error("Failed to resend OTP:", err)
    );

    res.json({ success: true, message: "OTP resent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to resend OTP" });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, username, email, password_hash, role, tenant_id, status, email_verified FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }

    const user = rows[0] as User;

    if (user.status === "blocked") {
      res.status(403).json({ success: false, error: "Your account has been blocked" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }

    // If email not verified, send a fresh OTP and tell frontend
    if (!user.email_verified) {
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const expiry = new Date(Date.now() + 10 * 60 * 1000);
      await pool.query(
        "UPDATE users SET email_verification_token = ?, email_verification_expiry = ? WHERE id = ?",
        [otp, expiry, user.id]
      );
      sendOTPEmail(email, user.username, otp).catch(console.error);

      res.status(403).json({
        success: false,
        requiresOTP: true,
        data: { email },
        error: "Please verify your email first. A new OTP has been sent.",
      });
      return;
    }

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
    });

    setAuthCookie(res, token);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          tenant_id: user.tenant_id,
          status: user.status,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("auth_token", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
  res.json({ success: true });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", verifyToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.email, u.role, u.tenant_id, u.status,
              u.email_verified, u.avatar_url, u.created_at,
              t.name AS tenant_name, t.slug AS tenant_slug
       FROM users u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.id = ? LIMIT 1`,
      [req.user!.sub]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch user" });
  }
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
router.post("/forgot-password", async (_req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: "If an account exists, a reset link has been sent." });
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
router.post("/reset-password", async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) {
    res.status(400).json({ success: false, error: "Token and password required" });
    return;
  }

  try {
    const [[user]] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE password_reset_token = ? AND password_reset_expiry > NOW() LIMIT 1",
      [token]
    );
    if (!user) {
      res.status(400).json({ success: false, error: "Invalid or expired reset token" });
      return;
    }
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      "UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expiry = NULL WHERE id = ?",
      [hash, user.id]
    );
    res.json({ success: true, message: "Password updated. You can now sign in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to reset password" });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function signToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = (process.env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]) ?? "7d";
  return jwt.sign(payload, secret, { expiresIn });
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export default router;
