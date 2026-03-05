import { z } from "zod";

export const createCommentDto = z.object({
  body: z.string().min(1).max(5000).trim(),
});

export const updateCommentDto = z.object({
  body: z.string().min(1).max(5000).trim(),
});

export const listCommentsDto = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateCommentDto = z.infer<typeof createCommentDto>;
export type UpdateCommentDto = z.infer<typeof updateCommentDto>;
export type ListCommentsDto  = z.infer<typeof listCommentsDto>;