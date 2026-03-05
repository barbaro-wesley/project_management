import { z } from "zod";
import { BoardRole } from "@prisma/client";

export const createBoardDto = z.object({
  name:        z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  workspaceId: z.string().uuid(),
});

export const updateBoardDto = z.object({
  name:        z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  isArchived:  z.boolean().optional(),
});

export const addBoardMemberDto = z.object({
  userId: z.string().uuid(),
  role:   z.nativeEnum(BoardRole).default(BoardRole.VIEWER),
});

export const updateBoardMemberDto = z.object({
  role: z.nativeEnum(BoardRole),
});

export type CreateBoardDto       = z.infer<typeof createBoardDto>;
export type UpdateBoardDto       = z.infer<typeof updateBoardDto>;
export type AddBoardMemberDto    = z.infer<typeof addBoardMemberDto>;
export type UpdateBoardMemberDto = z.infer<typeof updateBoardMemberDto>;