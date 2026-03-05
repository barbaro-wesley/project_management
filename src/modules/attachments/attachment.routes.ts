
// ── src/modules/attachments/attachment.routes.ts ──────────────────────────────
import { Router } from "express";
import * as AttachmentController from "./attachment.controller";
import { authGuard } from "@shared/middlewares/auth.guard";
import { requireBoardRole } from "@shared/middlewares/rbac.guard";
import { uploadMiddleware } from "@shared/middlewares/upload.middleware";
import { prisma } from "@infra/database/prisma.client";
import type { Request, Response, NextFunction } from "express";

const router = Router();
router.use(authGuard);

// Resolve boardId a partir do taskId para o rbac.guard
async function resolveBoardFromTask(req: Request, _res: Response, next: NextFunction) {
  try {
    const taskId = req.params.taskId ?? (
      await prisma.attachment.findUnique({
        where:  { id: req.params.attachmentId },
        select: { taskId: true },
      })
    )?.taskId;

    if (taskId) {
      const task = await prisma.task.findUnique({
        where:   { id: taskId },
        include: { column: { select: { boardId: true } } },
      });
      if (task) req.params.boardId = task.column.boardId;
    }
    next();
  } catch { next(); }
}

// ─── Rotas ────────────────────────────────────────────────────────────────────
router.post(
  "/tasks/:taskId/attachments",
  resolveBoardFromTask,
  requireBoardRole("EDITOR"),
  uploadMiddleware.array("files", 5),
  AttachmentController.upload
);

router.get(
  "/tasks/:taskId/attachments",
  resolveBoardFromTask,
  requireBoardRole("VIEWER"),
  AttachmentController.list
);

router.get(
  "/attachments/:attachmentId/download",
  resolveBoardFromTask,
  requireBoardRole("VIEWER"),
  AttachmentController.download
);

router.delete(
  "/attachments/:attachmentId",
  resolveBoardFromTask,
  requireBoardRole("EDITOR"),
  AttachmentController.remove
);

export default router;