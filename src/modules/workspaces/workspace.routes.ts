import { Router } from "express";
import * as WorkspaceController from "./workspace.controller";
import { authGuard } from "@shared/middlewares/auth.guard";
import { requireWorkspaceRole } from "@shared/middlewares/rbac.guard";

const router = Router();

// Todas as rotas exigem autenticação
router.use(authGuard);

// ─── Workspace ────────────────────────────────────────────────────────────────
router.post("/",                    WorkspaceController.create);
router.get("/",                     WorkspaceController.list);
router.get("/:workspaceId",         requireWorkspaceRole("MEMBER"), WorkspaceController.getOne);
router.put("/:workspaceId",         requireWorkspaceRole("ADMIN"),  WorkspaceController.update);
router.delete("/:workspaceId",      requireWorkspaceRole("OWNER"),  WorkspaceController.remove);

// ─── Membros ──────────────────────────────────────────────────────────────────
router.get("/:workspaceId/members",             requireWorkspaceRole("MEMBER"), WorkspaceController.getMembers);
router.patch("/:workspaceId/members/:userId",   requireWorkspaceRole("ADMIN"),  WorkspaceController.updateMemberRole);
router.delete("/:workspaceId/members/:userId",  requireWorkspaceRole("MEMBER"), WorkspaceController.removeMember);

export default router;