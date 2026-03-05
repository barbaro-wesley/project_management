import { Router } from "express";
import * as BoardController from "./board.controller";
import { authGuard } from "@shared/middlewares/auth.guard";
import { requireWorkspaceRole, requireBoardRole } from "@shared/middlewares/rbac.guard";

const router = Router({ mergeParams: true });
router.use(authGuard);

// boards do workspace
router.get("/", requireWorkspaceRole("MEMBER"), BoardController.list);
router.post("/", requireWorkspaceRole("MEMBER"), BoardController.create);

// board individual
router.get("/:boardId", requireBoardRole("VIEWER"), BoardController.getOne);
router.put("/:boardId", requireBoardRole("OWNER"), BoardController.update);
router.delete("/:boardId", requireBoardRole("OWNER"), BoardController.remove);

// membros
router.get("/:boardId/members", requireBoardRole("VIEWER"), BoardController.getMembers);
router.post("/:boardId/members", requireBoardRole("OWNER"), BoardController.addMember);
router.patch("/:boardId/members/:userId", requireBoardRole("OWNER"), BoardController.updateMemberRole);
router.delete("/:boardId/members/:userId", requireBoardRole("OWNER"), BoardController.removeMember);

export default router;