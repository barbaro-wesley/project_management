import { z } from "zod";

// ─── Create Role ──────────────────────────────────────────────────────────────

export const createSystemRoleDto = z.object({
  name: z
    .string({ required_error: "Nome é obrigatório" })
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(50, "Nome deve ter no máximo 50 caracteres")
    .trim()
    .toUpperCase(), // convenção: nomes de roles em UPPER_SNAKE_CASE

  description: z
    .string()
    .max(255, "Descrição deve ter no máximo 255 caracteres")
    .trim()
    .optional(),
});

// ─── Update Role ──────────────────────────────────────────────────────────────

export const updateSystemRoleDto = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(50, "Nome deve ter no máximo 50 caracteres")
    .trim()
    .toUpperCase()
    .optional(),

  description: z
    .string()
    .max(255, "Descrição deve ter no máximo 255 caracteres")
    .trim()
    .nullable()
    .optional(),
});

// ─── Attach / Detach Permission ───────────────────────────────────────────────

export const managePermissionDto = z.object({
  permissionId: z
    .string({ required_error: "permissionId é obrigatório" })
    .uuid("permissionId inválido"),
});

// ─── Create Permission ────────────────────────────────────────────────────────

export const createSystemPermissionDto = z.object({
  action: z
    .string({ required_error: "action é obrigatória" })
    .min(3, "action deve ter pelo menos 3 caracteres")
    .max(100, "action deve ter no máximo 100 caracteres")
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z]+:[a-z_]+$/,
      'action deve seguir o padrão "recurso:acao" (ex: users:create)',
    ),

  description: z
    .string()
    .max(255)
    .trim()
    .optional(),

  group: z
    .string()
    .max(50)
    .trim()
    .toLowerCase()
    .optional(),
});

// ─── List Roles (query params) ────────────────────────────────────────────────

export const listSystemRolesDto = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().positive().default(1)),

  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100).default(20)),

  search: z.string().trim().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateSystemRoleDto       = z.infer<typeof createSystemRoleDto>;
export type UpdateSystemRoleDto       = z.infer<typeof updateSystemRoleDto>;
export type ManagePermissionDto       = z.infer<typeof managePermissionDto>;
export type CreateSystemPermissionDto = z.infer<typeof createSystemPermissionDto>;
export type ListSystemRolesDto        = z.infer<typeof listSystemRolesDto>;