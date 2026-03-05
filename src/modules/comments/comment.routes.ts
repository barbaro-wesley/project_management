import { Router } from "express";
import * as CommentController from "./comment.controller";
import { authGuard } from "@shared/middlewares/auth.guard";
import { requireBoardRole } from "@shared/middlewares/rbac.guard";
import { prisma } from "@infra/database/prisma.client";
import type { Request, Response, NextFunction } from "express";

const router = Router();
router.use(authGuard);

// Resolve boardId a partir do taskId ou commentId para o rbac.guard
async function resolveBoardFromTask(req: Request, _res: Response, next: NextFunction) {
  try {
    const taskId = req.params.taskId ?? (
      await prisma.comment.findUnique({
        where:  { id: req.params.commentId },
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
router.get(
  "/tasks/:taskId/comments",
  resolveBoardFromTask,
  requireBoardRole("VIEWER"),
  CommentController.list
);

router.post(
  "/tasks/:taskId/comments",
  resolveBoardFromTask,
  requireBoardRole("VIEWER"), // qualquer membro pode comentar
  CommentController.create
);

router.patch(
  "/comments/:commentId",
  resolveBoardFromTask,
  requireBoardRole("VIEWER"),
  CommentController.update
);

router.delete(
  "/comments/:commentId",
  resolveBoardFromTask,
  requireBoardRole("VIEWER"),
  CommentController.remove
);

export default router;