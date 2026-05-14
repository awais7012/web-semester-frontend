import "dotenv/config";
import path from "path";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { testConnection } from "./config/db";
import apiRoutes from "./routes/index";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      // allow server-to-server (no origin) or listed origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: ${origin} not allowed`));
    },
    credentials: true,
  })
);

// Rate limiting — production only
const authLimiter = process.env.NODE_ENV === "production"
  ? rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      message: { success: false, error: "Too many auth attempts, please try again later" },
    })
  : (_req: Request, _res: Response, next: NextFunction) => next();

// ── Parsing ───────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  if (process.env.NODE_ENV === "production") {
    app.use(morgan("combined"));
  } else {
    const R = "\x1b[0m";
    const methodColors: Record<string, string> = {
      GET:    "\x1b[32m\x1b[1m",
      POST:   "\x1b[33m\x1b[1m",
      PUT:    "\x1b[34m\x1b[1m",
      PATCH:  "\x1b[35m\x1b[1m",
      DELETE: "\x1b[31m\x1b[1m",
    };
    morgan.token("cmethod", (req: Request) => { const m = req.method ?? "?"; return `${methodColors[m] ?? ""}${m.padEnd(6)}${R}`; });
    morgan.token("cstatus", (_req: Request, res: Response) => {
      const s = res.statusCode;
      const c = s >= 500 ? "\x1b[31m\x1b[1m" : s >= 400 ? "\x1b[33m\x1b[1m" : s >= 300 ? "\x1b[36m\x1b[1m" : "\x1b[32m\x1b[1m";
      return `${c}${s}${R}`;
    });
    app.use(morgan((tokens: any, req: Request, res: Response) => {
      const sep    = `\x1b[90m${"─".repeat(55)}${R}`;
      const method = tokens["cmethod"]!(req, res) ?? req.method;
      const url    = `\x1b[36m${tokens.url!(req, res) ?? ""}${R}`;
      const status = tokens["cstatus"]!(req, res) ?? "";
      const ms     = parseFloat(tokens["response-time"]!(req, res) ?? "0");
      const tColor = ms > 500 ? "\x1b[31m" : ms > 200 ? "\x1b[33m" : "\x1b[90m";
      const time   = `${tColor}${ms.toFixed(1)}ms${R}`;
      const date   = `\x1b[2m${tokens.date!(req, res, "clf") ?? ""}${R}`;
      return `${sep}\n  ${method}  ${url}\n  ${status}  ${time}  ${date}`;
    }));
  }
}

// ── Static files ──────────────────────────────────────────────────────────────
app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter);
app.use("/api", apiRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀  Backend running on http://localhost:${PORT}`);
    console.log(`📋  API docs: http://localhost:${PORT}/api`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

export default app;
