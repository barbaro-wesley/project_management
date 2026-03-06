import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import hpp from "hpp";
import mongoSanitize from "express-mongo-sanitize";

import { env } from "@config/env";
import { errorHandler } from "@shared/middlewares/error-handler";
import {
  globalRateLimit,
  authRateLimit,
  uploadRateLimit,
  inviteRateLimit,
} from "@config/security";

// ─── Rotas ────────────────────────────────────────────────────────────────────
import authRoutes from "@modules/auth/auth.routes";
import workspaceRoutes from "@modules/workspaces/workspace.routes";
import inviteRoutes from "@modules/invites/invite.routes";
import boardRoutes from "@modules/boards/board.routes";
import { columnRouter } from "@modules/columns/column.routes";
import taskRoutes from "@modules/tasks/task.routes";
import attachmentRoutes from "@modules/attachments/attachment.routes";
import commentRoutes from "@modules/comments/comment.routes";
import notificationRoutes from "@modules/notifications/notification.routes";
import userRoutes from "@modules/users/user.routes";
import systemRoleRoutes from "@modules/system-roles/system-role.routes";


export function createApp() {
  const app = express();

  // ─── 1. Proxy trust (obrigatório para rate limit com IP real atrás de nginx) ─
  app.set("trust proxy", 1);

  // ─── 2. Helmet — headers de segurança HTTP ────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: env.NODE_ENV === "production" ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false, // necessário para downloads de arquivo
      hsts: env.NODE_ENV === "production"
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    })
  );

  // ─── 3. CORS refinado ─────────────────────────────────────────────────────────
  const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map(o => o.trim());

  app.use(
    cors({
      origin: (origin, cb) => {
        // Permite requests sem origin (Postman, mobile, curl em dev)
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`Origem não permitida pelo CORS: ${origin}`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining"],
      maxAge: 86400, // cache preflight por 24h
    })
  );

  // ─── 4. Parsing ───────────────────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));           // body JSON máximo 1 MB
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());

  // ─── 5. HPP — HTTP Parameter Pollution (ex: ?role=admin&role=owner) ──────────
  app.use(hpp());

  // ─── 6. Sanitização — remove operadores NoSQL de query strings e body ─────────
  app.use(mongoSanitize());

  // ─── 7. Logging ───────────────────────────────────────────────────────────────
  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  // ─── 8. Rate limit global ─────────────────────────────────────────────────────
  app.use("/api", globalRateLimit);

  // ─── 9. Health check (sem rate limit) ────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ─── 10. Rotas com rate limits específicos ────────────────────────────────────
  app.use("/api/auth", authRateLimit, authRoutes);
  app.use("/api/workspaces", workspaceRoutes);
  app.use("/api/invites", inviteRateLimit, inviteRoutes);
  app.use("/api/boards", boardRoutes);
  app.use("/api/workspaces/:workspaceId/boards", boardRoutes);
  app.use("/api/boards/:boardId/columns", columnRouter);
  app.use("/api", taskRoutes);
  app.use("/api", uploadRateLimit, attachmentRoutes);
  app.use("/api", commentRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/system-roles", systemRoleRoutes);
  // ─── 11. Handler global de erros ─────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}