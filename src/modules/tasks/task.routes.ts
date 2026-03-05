import { Router } from "express";
import * as TaskController from "./task.controller";
import { authGuard } from "@shared/middlewares/auth.guard";
import { requireBoardRole } from "@shared/middlewares/rbac.guard";
import { prisma } from "@infra/database/prisma.client";
import type { Request, Response, NextFunction } from "express";

const router = Router();
router.use(authGuard);

// Middleware auxiliar: resolve boardId a partir do columnId ou taskId
// para que o requireBoardRole funcione corretamente com params aninhados
async function resolveBoardFromColumn(req: Request, _res: Response, next: NextFunction) {
  try {
    const columnId = req.params.columnId;
    if (!columnId) return next();
    const col = await prisma.column.findUnique({
      where:  { id: columnId },
      select: { boardId: true },
    });
    if (col) req.params.boardId = col.boardId;
    next();
  } catch { next(); }
}

async function resolveBoardFromTask(req: Request, _res: Response, next: NextFunction) {
  try {
    const taskId = req.params.taskId;
    if (!taskId) return next();
    const task = await prisma.task.findUnique({
      where:   { id: taskId },
      include: { column: { select: { boardId: true } } },
    });
    if (task) req.params.boardId = task.column.boardId;
    next();
  } catch { next(); }
}

// ─── Tasks por coluna ─────────────────────────────────────────────────────────
router.get(
  "/columns/:columnId/tasks",
  resolveBoardFromColumn,
  requireBoardRole("VIEWER"),
  TaskController.list
);

router.post(
  "/columns/:columnId/tasks",
  resolveBoardFromColumn,
  requireBoardRole("EDITOR"),
  TaskController.create
);

// ─── Task individual ──────────────────────────────────────────────────────────
router.get(
  "/tasks/:taskId",
  resolveBoardFromTask,
  requireBoardRole("VIEWER"),
  TaskController.getOne
);

router.put(
  "/tasks/:taskId",
  resolveBoardFromTask,
  requireBoardRole("EDITOR"),
  TaskController.update
);

router.delete(
  "/tasks/:taskId",
  resolveBoardFromTask,
  requireBoardRole("EDITOR"),
  TaskController.remove
);

// ─── Mover task (core realtime) ───────────────────────────────────────────────
router.patch(
  "/tasks/:taskId/move",
  resolveBoardFromTask,
  requireBoardRole("EDITOR"),
  TaskController.move
);

export default router;