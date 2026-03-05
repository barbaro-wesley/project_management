import { Queue } from "bullmq";
import { env } from "@config/env";

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: Number(new URL(env.REDIS_URL).port) || 6379,
  password: new URL(env.REDIS_URL).password || undefined,
  maxRetriesPerRequest: null,
};

export const notificationQueue = new Queue("notifications", { connection });

export async function enqueueTaskMovedNotification(payload: {
  taskId: string;
  assigneeIds: string[];
  movedBy: string;
}) {
  await notificationQueue.add("task.moved", payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}