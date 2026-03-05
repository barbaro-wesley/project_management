import { prisma } from "@infra/database/prisma.client";
import * as StorageService from "@infra/storage/storage.service";
import { EventPublisher } from "@infra/redis/event-publisher";
import { NotFoundError, ForbiddenError } from "@shared/errors/app.error";

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadAttachments(
  taskId:       string,
  uploadedById: string,
  files:        Express.Multer.File[],
  events:       EventPublisher
) {
  const task = await prisma.task.findUnique({
    where:   { id: taskId },
    include: {
      column: {
        include: { board: { select: { id: true, workspaceId: true } } },
      },
    },
  });
  if (!task) throw new NotFoundError("Task");

  const { boardId, workspaceId } = task.column.board;

  const uploaded = await Promise.all(
    files.map(file =>
      StorageService.uploadFile({
        workspaceId,
        taskId,
        filename:  file.originalname,
        mimeType:  file.mimetype,
        buffer:    file.buffer,
        sizeBytes: file.size,
      })
    )
  );

  const attachments = await prisma.$transaction(
    uploaded.map(({ storagePath, filename }, idx) =>
      prisma.attachment.create({
        data: {
          taskId,
          uploadedById,
          filename,
          storagePath,
          mimeType:  files[idx].mimetype,
          sizeBytes: BigInt(files[idx].size),
        },
        select: {
          id:        true,
          filename:  true,
          mimeType:  true,
          sizeBytes: true,
          createdAt: true,
          // storagePath nunca sai do servidor
        },
      })
    )
  );

  await events.publishToBoard(boardId, "task:updated", {
    taskId,
    attachmentsAdded: attachments.length,
  });

  return attachments.map(a => ({ ...a, sizeBytes: Number(a.sizeBytes) }));
}

// ─── Listar (sem URLs, sem storagePath) ───────────────────────────────────────

export async function listAttachments(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new NotFoundError("Task");

  const attachments = await prisma.attachment.findMany({
    where:   { taskId },
    select: {
      id:        true,
      filename:  true,
      mimeType:  true,
      sizeBytes: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return attachments.map(a => ({ ...a, sizeBytes: Number(a.sizeBytes) }));
}

// ─── Download como Buffer ─────────────────────────────────────────────────────

export interface DownloadResult {
  buffer:   Buffer;
  filename: string;
  mimeType: string;
}

export async function downloadAttachment(attachmentId: string): Promise<DownloadResult> {
  const att = await prisma.attachment.findUnique({
    where:  { id: attachmentId },
    select: { storagePath: true, filename: true, mimeType: true },
  });
  if (!att) throw new NotFoundError("Attachment");

  const buffer = await StorageService.downloadFileAsBuffer(att.storagePath);

  return { buffer, filename: att.filename, mimeType: att.mimeType };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteAttachment(
  attachmentId: string,
  userId:       string,
  events:       EventPublisher
) {
  const att = await prisma.attachment.findUnique({
    where:   { id: attachmentId },
    include: {
      task: {
        include: {
          column: { include: { board: { select: { id: true } } } },
        },
      },
    },
  });
  if (!att) throw new NotFoundError("Attachment");

  const isUploader    = att.uploadedById === userId;
  const isTaskCreator = att.task.creatorId === userId;
  if (!isUploader && !isTaskCreator) {
    throw new ForbiddenError("Sem permissão para remover este anexo");
  }

  await Promise.all([
    StorageService.deleteFile(att.storagePath),
    prisma.attachment.delete({ where: { id: attachmentId } }),
  ]);

  const boardId = att.task.column.board.id;
  await events.publishToBoard(boardId, "task:updated", {
    taskId:            att.taskId,
    attachmentDeleted: attachmentId,
  });
}