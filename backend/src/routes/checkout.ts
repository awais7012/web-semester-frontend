import Stripe from "stripe";
import { Router, Response } from "express";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import pool from "../config/db";
import { verifyToken, optionalAuth } from "../middleware/auth";
import { setTenantContext } from "../middleware/tenant";
import { AuthRequest } from "../types/index";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const router = Router();

// POST /api/checkout/session — create a Stripe Checkout Session
router.post("/session", verifyToken, setTenantContext, async (req: AuthRequest, res: Response): Promise<void> => {
  const { product_ids, phone, address } = req.body as {
    product_ids: Array<{ product_id: number; quantity: number }>;
    phone?: string;
    address?: string;
  };

  if (!req.tenantId) {
    res.status(400).json({ success: false, error: "Tenant context required" });
    return;
  }
  if (!product_ids?.length) {
    res.status(400).json({ success: false, error: "No products provided" });
    return;
  }

  try {
    const ids = product_ids.map((p) => p.product_id);

    const [products] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, price, is_archived, tenant_id
       FROM products WHERE id IN (?) AND tenant_id = ? AND is_archived = 0`,
      [ids, req.tenantId]
    );

    if ((products as RowDataPacket[]).length !== ids.length) {
      res.status(400).json({ success: false, error: "One or more products are invalid or unavailable" });
      return;
    }

    const [[tenant]] = await pool.query<RowDataPacket[]>(
      "SELECT id, slug, stripe_account_id FROM tenants WHERE id = ? LIMIT 1",
      [req.tenantId]
    );

    const origin = process.env.ROOT_DOMAIN
      ? `http://${process.env.ROOT_DOMAIN}`
      : "http://localhost:3000";

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = (products as RowDataPacket[]).map((p) => ({
      price_data: {
        currency: "pkr",
        product_data: { name: p.name as string },
        unit_amount: Math.round(Number(p.price) * 100),
      },
      quantity: product_ids.find((item) => item.product_id === p.id)?.quantity ?? 1,
    }));

    const totalCents = lineItems.reduce(
      (sum, item) => sum + (item.price_data!.unit_amount! * (item.quantity ?? 1)),
      0
    );

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/tenants/${tenant.slug}/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/tenants/${tenant.slug}/checkout?cancel=true`,
      metadata: {
        user_id:     String(req.user!.sub),
        tenant_id:   String(req.tenantId),
        product_ids: ids.join(","),
        phone:       phone ?? "",
        address:     address ?? "",
      },
    };

    // If vendor connected Stripe — route to their account with 10% platform fee
    if (tenant.stripe_account_id) {
      sessionParams.payment_intent_data = {
        transfer_data: { destination: tenant.stripe_account_id as string },
        application_fee_amount: Math.round(totalCents * 0.1),
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    console.error("Stripe session error:", err);
    res.status(500).json({ success: false, error: "Failed to create checkout session" });
  }
});

// POST /api/checkout/verify — called after Stripe redirects back with session_id
// Uses optionalAuth: order data comes from Stripe metadata, not the JWT
router.post("/verify", optionalAuth, setTenantContext, async (req: AuthRequest, res: Response): Promise<void> => {
  const { session_id } = req.body as { session_id?: string };

  if (!session_id) {
    res.status(400).json({ success: false, error: "session_id required" });
    return;
  }

  try {
    // Idempotency — don't double-create orders for the same Stripe session
    const [[existing]] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM orders WHERE stripe_checkout_session_id = ? LIMIT 1",
      [session_id]
    );
    if (existing) {
      res.json({ success: true, data: { orderId: existing.id } });
      return;
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(session_id);
    } catch {
      res.status(400).json({ success: false, error: "Invalid or expired session ID" });
      return;
    }

    if (session.payment_status !== "paid") {
      res.status(400).json({ success: false, error: "Payment not completed" });
      return;
    }

    const meta     = session.metadata!;
    const userId   = Number(meta.user_id);
    const tenantId = Number(meta.tenant_id);
    const ids      = meta.product_ids.split(",").map(Number);
    const phone    = meta.phone || null;
    const address  = meta.address || null;

    const [products] = await pool.query<RowDataPacket[]>(
      "SELECT id, price FROM products WHERE id IN (?)",
      [ids]
    );

    const priceMap: Record<number, number> = {};
    for (const p of products as Array<{ id: number; price: number }>) {
      priceMap[p.id] = Number(p.price);
    }

    const total = ids.reduce((sum, id) => sum + (priceMap[id] ?? 0), 0);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [orderResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO orders (user_id, tenant_id, total_amount, phone, shipping_address, stripe_checkout_session_id, status)
         VALUES (?, ?, ?, ?, ?, ?, 'completed')`,
        [userId, tenantId, total, phone, address, session_id]
      );
      const orderId = orderResult.insertId;

      const itemRows = ids.map((id) => [orderId, id, 1, priceMap[id] ?? 0]);
      await conn.query(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ?",
        [itemRows]
      );

      await conn.commit();
      res.json({ success: true, data: { orderId } });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ success: false, error: "Failed to verify payment" });
  }
});

export default router;
