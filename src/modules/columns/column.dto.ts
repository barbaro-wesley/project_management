import { z } from "zod";

export const createColumnDto = z.object({
  name:  z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const updateColumnDto = z.object({
  name:  z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const reorderColumnsDto = z.object({
  // Array de { id, position } representando a nova ordem
  columns: z.array(
    z.object({
      id:       z.string().uuid(),
      position: z.number().int().min(0),
    })
  ).min(1),
});

export type CreateColumnDto   = z.infer<typeof createColumnDto>;
export type UpdateColumnDto   = z.infer<typeof updateColumnDto>;
export type ReorderColumnsDto = z.infer<typeof reorderColumnsDto>;