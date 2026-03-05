import { prisma } from "@infra/database/prisma.client";
import { EventPublisher } from "@infra/redis/event-publisher";
import { NotFoundError, ForbiddenError } from "@shared/errors/app.error";
import type { CreateCommentDto, UpdateCommentDto, ListCommentsDto } from "./dtos/comment.dto";

// ─── Select reutilizável ──────────────────────────────────────────────────────

const commentSelect = {
  id:        true,
  body:      true,
  editedAt:  true,
  createdAt: true,
  author: {
    select: { id: true, name: true, avatarUrl: true },
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getTaskWithBoard(taskId: string) {
  const task = await prisma.task.findUnique({
    where:   { id: taskId },
    include: { column: { select: { boardId: true } } },
  });
  if (!task) throw new NotFoundError("Task");
  return task;
}

async function getCommentOrThrow(commentId: string) {
  const comment = await prisma.comment.findUnique({
    where:  { id: commentId },
    select: {
      ...commentSelect,
      authorId: true,
      taskId:   true,
      task: { include: { column: { select: { boardId: true } } } },
    },
  });
  if (!comment) throw new NotFoundError("Comentário");
  return comment;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function createComment(
  taskId:   string,
  authorId: string,
  dto:      CreateCommentDto,
  events:   EventPublisher
) {
  const task    = await getTaskWithBoard(taskId);
  const boardId = task.column.boardId;

  const comment = await prisma.comment.create({
    data:   { taskId, authorId, body: dto.body },
    select: commentSelect,
  });

  await events.publishToBoard(boardId, "task:updated", {
    taskId,
    comment: { action: "created", data: comment },
  });

  return comment;
}

export async function listComments(taskId: string, dto: ListCommentsDto) {
  await getTaskWithBoard(taskId);

  const [comments, total] = await prisma.$transaction([
    prisma.comment.findMany({
      where:   { taskId },
      select:  commentSelect,
      orderBy: { createdAt: "asc" },
      skip:    (dto.page - 1) * dto.limit,
      take:    dto.limit,
    }),
    prisma.comment.count({ where: { taskId } }),
  ]);

  return { comments, total, page: dto.page, limit: dto.limit };
}

export async function updateComment(
  commentId: string,
  userId:    string,
  dto:       UpdateCommentDto,
  events:    EventPublisher
) {
  const existing = await getCommentOrThrow(commentId);

  if (existing.authorId !== userId) {
    throw new ForbiddenError("Apenas o autor pode editar o comentário");
  }

  const updated = await prisma.comment.update({
    where:  { id: commentId },
    data:   { body: dto.body, editedAt: new Date() },
    select: commentSelect,
  });

  const boardId = existing.task.column.boardId;
  await events.publishToBoard(boardId, "task:updated", {
    taskId:  existing.taskId,
    comment: { action: "updated", data: updated },
  });

  return updated;
}

export async function deleteComment(
  commentId: string,
  userId:    string,
  events:    EventPublisher
) {
  const existing = await getCommentOrThrow(commentId);

  if (existing.authorId !== userId) {
    throw new ForbiddenError("Apenas o autor pode deletar o comentário");
  }

  await prisma.comment.delete({ where: { id: commentId } });

  const boardId = existing.task.column.boardId;
  await events.publishToBoard(boardId, "task:updated", {
    taskId:  existing.taskId,
    comment: { action: "deleted", commentId },
  });
}