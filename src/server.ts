import "dotenv/config";
import http from "http";
import { Server as SocketServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createApp } from "./app";
import { env } from "@config/env";
import { prisma } from "@infra/database/prisma.client";
import { redisClient, redisSub } from "@infra/redis/redis.client";
import { ensureBucketExists } from "@infra/storage/minio.client";
import { EventPublisher } from "@infra/redis/event-publisher";
import { createNotificationWorker } from "@infra/queue/workers/notification.worker";
async function clearRateLimitKeys() {
  if (env.NODE_ENV !== "development") return;
  const prefixes = ["rl:global:", "rl:auth:", "rl:upload:", "rl:invite:"];
  for (const prefix of prefixes) {
    const keys = await redisClient.keys(`${prefix}*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      console.log(`🧹 Rate limit limpo: ${prefix} (${keys.length} chaves)`);
    }
  }
}
async function bootstrap() {
  await prisma.$connect();
  console.log("✅ PostgreSQL conectado");
 await clearRateLimitKeys();
  await ensureBucketExists();

  const app        = createApp();
  const httpServer = http.createServer(app);

  // ─── Socket.io ──────────────────────────────────────────────────────────────
  const io = new SocketServer(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
    transports: ["websocket", "polling"],
  });

  io.adapter(createAdapter(redisClient, redisSub));

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId as string | undefined;
    console.log(`[WS] Cliente conectado: ${socket.id}`);

    // Room privada do usuário — recebe notificações em tempo real
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Rooms de boards
    socket.on("board:join", (boardId: string) => {
      socket.join(`board:${boardId}`);
      socket.emit("board:joined", { boardId });
    });

    socket.on("board:leave", (boardId: string) => {
      socket.leave(`board:${boardId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Cliente desconectado: ${socket.id}`);
    });
  });

  // ─── Injeta io nos serviços ──────────────────────────────────────────────────
  const events = new EventPublisher(io);
  app.set("io",     io);
  app.set("events", events);

  // ─── BullMQ Worker (recebe io para emitir notificações) ──────────────────────
  createNotificationWorker(io);
  console.log("✅ Notification worker iniciado");

  // ─── Start ───────────────────────────────────────────────────────────────────
  httpServer.listen(env.PORT, () => {
    console.log(`🚀 Server rodando em http://localhost:${env.PORT}`);
    console.log(`🔌 WebSocket pronto`);
    console.log(`🌍 Ambiente: ${env.NODE_ENV}`);
  });

  // ─── Graceful shutdown ────────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n[${signal}] Encerrando servidor...`);
    httpServer.close();
    await prisma.$disconnect();
    redisClient.disconnect();
    redisSub.disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("❌ Falha ao iniciar:", err);
  process.exit(1);
});