import type { Request, Response, NextFunction } from "express";
import { WorkspaceRole, BoardRole } from "@prisma/client";
import {
  getUserWorkspaceRole,
  getUserBoardRole,
} from "@shared/services/permission.service";
import {
  hasWorkspaceRole,
  hasBoardRole,
} from "@shared/types/rbac.types";

// ─── Workspace Guard ──────────────────────────────────────────────────────────
// Uso: router.delete("/:id", authGuard, requireWorkspaceRole("ADMIN"), handler)
// O workspaceId deve vir em req.params.workspaceId

export function requireWorkspaceRole(required: WorkspaceRole) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { id: userId } = req.user;
    const workspaceId = req.params.workspaceId ?? req.body.workspaceId;

    if (!workspaceId) {
      res.status(400).json({ status: "error", message: "workspaceId ausente" });
      return;
    }

    const role = await getUserWorkspaceRole(userId, workspaceId);

    if (!role || !hasWorkspaceRole(role, required)) {
      res.status(403).json({
        status:  "error",
        code:    "FORBIDDEN",
        message: `Requer papel ${required} ou superior no workspace`,
      });
      return;
    }

    // Disponibiliza o papel na request para uso nos controllers
    req.workspaceRole = role;
    next();
  };
}

// ─── Board Guard ──────────────────────────────────────────────────────────────
// Uso: router.put("/:boardId", authGuard, requireBoardRole("EDITOR"), handler)
// O boardId deve vir em req.params.boardId

export function requireBoardRole(required: BoardRole) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { id: userId } = req.user;
    const boardId = req.params.boardId ?? req.body.boardId;

    if (!boardId) {
      res.status(400).json({ status: "error", message: "boardId ausente" });
      return;
    }

    const role = await getUserBoardRole(userId, boardId);

    if (!role || !hasBoardRole(role, required)) {
      res.status(403).json({
        status:  "error",
        code:    "FORBIDDEN",
        message: `Requer papel ${required} ou superior no board`,
      });
      return;
    }

    req.boardRole = role;
    next();
  };
}