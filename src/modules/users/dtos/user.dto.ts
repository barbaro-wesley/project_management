import { z } from "zod";

// ─── Create User ──────────────────────────────────────────────────────────────

export const createUserDto = z.object({
  name: z
    .string({ required_error: "Nome é obrigatório" })
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .trim(),

  email: z
    .string({ required_error: "E-mail é obrigatório" })
    .email("E-mail inválido")
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: "Senha é obrigatória" })
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(72, "Senha deve ter no máximo 72 caracteres"),

  avatarUrl: z.string().url("URL do avatar inválida").optional(),
});

// ─── Update User ──────────────────────────────────────────────────────────────

export const updateUserDto = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .trim()
    .optional(),

  avatarUrl: z
    .string()
    .url("URL do avatar inválida")
    .nullable()
    .optional(),

  isVerified: z.boolean().optional(),
});

// ─── List Users (query params) ────────────────────────────────────────────────

export const listUsersDto = z.object({
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

  isVerified: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
});

// ─── Assign System Role ───────────────────────────────────────────────────────

export const assignSystemRoleDto = z.object({
  roleId: z.string({ required_error: "roleId é obrigatório" }).uuid("roleId inválido"),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateUserDto      = z.infer<typeof createUserDto>;
export type UpdateUserDto      = z.infer<typeof updateUserDto>;
export type ListUsersDto       = z.infer<typeof listUsersDto>;
export type AssignSystemRoleDto = z.infer<typeof assignSystemRoleDto>;