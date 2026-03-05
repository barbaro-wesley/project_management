import { Worker } from "bullmq";
import { env } from "@config/env";
import { prisma } from "@infra/database/prisma.client";
import { NotificationType } from "@prisma/client";
import type { Server as SocketServer } from "socket.io";

const connection = {
  host:                 new URL(env.REDIS_URL).hostname,
  port:                 Number(new URL(env.REDIS_URL).port) || 6379,
  password:             new URL(env.REDIS_URL).password || undefined,
  maxRetriesPerRequest: null,
};

export function createNotificationWorker(io: SocketServer) {
  const worker = new Worker(
    "notifications",
    async (job) => {
      if (job.name === "task.moved") {
        const { taskId, assigneeIds, movedBy } = job.data as {
          taskId:      string;
          assigneeIds: string[];
          movedBy:     string;
        };

        const targets = assigneeIds.filter(id => id !== movedBy);
        if (!targets.length) return;

        // Busca título da task para montar a mensagem
        const task = await prisma.task.findUnique({
          where:  { id: taskId },
          select: { title: true },
        });

        // Cria uma notificação por usuário para ter o id individual
        // (necessário para emitir via socket e marcar como lida)
        const notifications = await prisma.$transaction(
          targets.map(userId =>
            prisma.notification.create({
              data: {
                userId,
                type:       NotificationType.TASK_MOVED,
                title:      "Tarefa movida",
                body:       `A tarefa "${task?.title ?? ""}" foi movida.`,
                resourceId: taskId,
              },
              select: {
                id:         true,
                type:       true,
                title:      true,
                body:       true,
                resourceId: true,
                isRead:     true,
                createdAt:  true,
              },
            })
          )
        );

        // Emite para a room privada de cada usuário
        for (let i = 0; i < targets.length; i++) {
          io.to(`user:${targets[i]}`).emit("notification:new", notifications[i]);
        }
      }
    },
    { connection }
  );

  worker.on("completed", (job) => {
    console.log(`[Queue] Job ${job.id} concluído`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Queue] Job ${job?.id} falhou:`, err.message);
  });

  return worker;
}