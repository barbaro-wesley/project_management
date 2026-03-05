import { z } from "zod";
import { WorkspaceRole } from "@prisma/client";

export const createInviteDto = z.object({
  email: z.string().email(),
  role:  z.nativeEnum(WorkspaceRole).default(WorkspaceRole.MEMBER),
});

export const acceptInviteDto = z.object({
  token: z.string().uuid(),
});

export type CreateInviteDto = z.infer<typeof createInviteDto>;
export type AcceptInviteDto = z.infer<typeof acceptInviteDto>;