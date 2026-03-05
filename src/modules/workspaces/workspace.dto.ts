import { z } from "zod";
import { WorkspaceRole } from "@prisma/client";

export const createWorkspaceDto = z.object({
  name:        z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

export const updateWorkspaceDto = z.object({
  name:        z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const updateMemberRoleDto = z.object({
  role: z.nativeEnum(WorkspaceRole),
});

export type CreateWorkspaceDto  = z.infer<typeof createWorkspaceDto>;
export type UpdateWorkspaceDto  = z.infer<typeof updateWorkspaceDto>;
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleDto>;