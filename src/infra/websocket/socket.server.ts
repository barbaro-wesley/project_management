import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { redisClient, redisSub } from "@infra/redis/redis.client";
import { env } from "@config/env";

export function createSocketServer(httpServer: any): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
    transports: ["websocket", "polling"],
  });

  // Adapter distribui eventos entre todos os pods via Redis
  io.adapter(createAdapter(redisClient, redisSub));

  io.on("connection", (socket) => {
    console.log(`[WS] Cliente conectado: ${socket.id}`);

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

  return io;
}