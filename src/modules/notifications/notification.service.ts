import { prisma } from "@infra/database/prisma.client";
import { NotFoundError, ForbiddenError } from "@shared/errors/app.error";
import type { ListNotificationsDto } from "./dtos/notification.dto";

// ─── Listar ───────────────────────────────────────────────────────────────────

export async function listNotifications(userId: string, dto: ListNotificationsDto) {
  const where = {
    userId,
    ...(dto.unreadOnly && { isRead: false }),
  };

  const [notifications, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      select: {
        id:         true,
        type:       true,
        title:      true,
        body:       true,
        resourceId: true,
        isRead:     true,
        createdAt:  true,
      },
      orderBy: { createdAt: "desc" },
      skip:    (dto.page - 1) * dto.limit,
      take:    dto.limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { notifications, total, unreadCount, page: dto.page, limit: dto.limit };
}

// ─── Marcar uma como lida ─────────────────────────────────────────────────────

export async function markAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({
    where:  { id: notificationId },
    select: { id: true, userId: true },
  });

  if (!notification) throw new NotFoundError("Notificação");

  // Garante que o usuário só pode marcar suas próprias notificações
  if (notification.userId !== userId) {
    throw new ForbiddenError("Acesso negado");
  }

  return prisma.notification.update({
    where:  { id: notificationId },
    data:   { isRead: true },
    select: { id: true, isRead: true },
  });
}

// ─── Marcar todas como lidas ──────────────────────────────────────────────────

export async function markAllAsRead(userId: string) {
  const { count } = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true },
  });

  return { updated: count };
}

// ─── Deletar uma notificação ──────────────────────────────────────────────────

export async function deleteNotification(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({
    where:  { id: notificationId },
    select: { id: true, userId: true },
  });

  if (!notification) throw new NotFoundError("Notificação");
  if (notification.userId !== userId) throw new ForbiddenError("Acesso negado");

  await prisma.notification.delete({ where: { id: notificationId } });
}