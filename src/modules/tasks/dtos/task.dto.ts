import { z } from "zod";
import { TaskPriority, TaskStatus } from "@prisma/client";

export const createTaskDto = z.object({
  title:       z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  priority:    z.nativeEnum(TaskPriority).default(TaskPriority.NONE),
  dueDate:     z.string().datetime().optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  labelIds:    z.array(z.string().uuid()).optional(),
});

export const updateTaskDto = z.object({
  title:       z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  priority:    z.nativeEnum(TaskPriority).optional(),
  status:      z.nativeEnum(TaskStatus).optional(),
  dueDate:     z.string().datetime().nullable().optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  labelIds:    z.array(z.string().uuid()).optional(),
});

export const moveTaskDto = z.object({
  targetColumnId: z.string().uuid(),
  position:       z.number().int().min(0),
});

export const taskFiltersDto = z.object({
  assigneeId: z.string().uuid().optional(),
  priority:   z.nativeEnum(TaskPriority).optional(),
  status:     z.nativeEnum(TaskStatus).optional(),
  search:     z.string().optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTaskDto  = z.infer<typeof createTaskDto>;
export type UpdateTaskDto  = z.infer<typeof updateTaskDto>;
export type MoveTaskDto    = z.infer<typeof moveTaskDto>;
export type TaskFiltersDto = z.infer<typeof taskFiltersDto>;