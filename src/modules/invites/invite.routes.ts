import { Router } from "express";
import * as InviteController from "./invite.controller";
import { authGuard } from "@shared/middlewares/auth.guard";
import { requireWorkspaceRole } from "@shared/middlewares/rbac.guard";

const router = Router();

router.use(authGuard);

// Aceitar convite — qualquer usuário logado com o token correto
router.get("/accept", InviteController.accept);

// Rotas de workspace — requerem papel
router.post(
  "/:workspaceId/invites",
  requireWorkspaceRole("ADMIN"),
  InviteController.create
);

router.get(
  "/:workspaceId/invites",
  requireWorkspaceRole("ADMIN"),
  InviteController.list
);

router.patch(
  "/:workspaceId/invites/:inviteId/revoke",
  requireWorkspaceRole("ADMIN"),
  InviteController.revoke
);

export default router;