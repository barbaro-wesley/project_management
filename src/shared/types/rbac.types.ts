import { WorkspaceRole, BoardRole } from "@prisma/client";

// ─── Hierarquia de papéis ─────────────────────────────────────────────────────
// Quanto maior o número, mais permissão o papel possui.

export const WORKSPACE_ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  GUEST:  0,
  MEMBER: 1,
  ADMIN:  2,
  OWNER:  3,
};

export const BOARD_ROLE_HIERARCHY: Record<BoardRole, number> = {
  VIEWER: 0,
  EDITOR: 1,
  OWNER:  2,
};

// ─── Helpers de comparação ────────────────────────────────────────────────────

export function hasWorkspaceRole(
  userRole: WorkspaceRole,
  required: WorkspaceRole
): boolean {
  return WORKSPACE_ROLE_HIERARCHY[userRole] >= WORKSPACE_ROLE_HIERARCHY[required];
}

export function hasBoardRole(
  userRole: BoardRole,
  required: BoardRole
): boolean {
  return BOARD_ROLE_HIERARCHY[userRole] >= BOARD_ROLE_HIERARCHY[required];
}