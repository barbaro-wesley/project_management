import { redisClient } from "@infra/redis/redis.client";
import { Server } from "socket.io";

export type BoardEvent =
  | "task:moved"
  | "task:updated"
  | "task:created"
  | "task:deleted"
  | "column:created"
  | "column:reordered";

export class EventPublisher {
  constructor(private readonly io: Server) {}

  async publishToBoard(boardId: string, event: BoardEvent, payload: unknown) {
    this.io.to(`board:${boardId}`).emit(event, payload);

    await redisClient.xadd(
      `stream:board:${boardId}`,
      "*",
      "event", event,
      "payload", JSON.stringify(payload)
    );
  }
}