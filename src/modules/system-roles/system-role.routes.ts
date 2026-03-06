import { Router } from "express";
import { authGuard }          from "@shared/middlewares/auth.guard";
import { requirePermission }     from "@shared/middlewares/require-permission.middleware";
import * as SystemRoleController from "./system-role.controller";

const router = Router();

// Todas as rotas exigem autenticação
router.use(authGuard);

// ─── Catálogo de Permissões ───────────────────────────────────────────────────
// Rotas /permissions são registradas ANTES de /:id para evitar conflito

/**
 * GET /system-roles/permissions
 * Lista todas as permissões disponíveis no sistema.
 * Requer: roles:manage
 */
router.get(
  "/permissions",
  requirePermission("roles:manage"),
  SystemRoleController.listPermissions,
);

/**
 * POST /system-roles/permissions
 * Cria uma nova permissão no catálogo.
 * Requer: roles:manage
 */
router.post(
  "/permissions",
  requirePermission("roles:manage"),
  SystemRoleController.createPermission,
);

/**
 * DELETE /system-roles/permissions/:permissionId
 * Remove uma permissão do catálogo (e de todos os roles que a tinham).
 * Requer: roles:manage
 */
router.delete(
  "/permissions/:permissionId",
  requirePermission("roles:manage"),
  SystemRoleController.deletePermission,
);

// ─── System Roles ─────────────────────────────────────────────────────────────

/**
 * GET /system-roles
 * Lista todos os roles com suas permissões.
 * Requer: roles:manage
 */
router.get(
  "/",
  requirePermission("roles:manage"),
  SystemRoleController.list,
);

/**
 * POST /system-roles
 * Cria um novo system role.
 * Requer: roles:manage
 */
router.post(
  "/",
  requirePermission("roles:manage"),
  SystemRoleController.create,
);

/**
 * GET /system-roles/:id
 * Retorna um role com suas permissões.
 * Requer: roles:manage
 */
router.get(
  "/:id",
  requirePermission("roles:manage"),
  SystemRoleController.getOne,
);

/**
 * PATCH /system-roles/:id
 * Atualiza nome/descrição de um role (não pode ser isSystem).
 * Requer: roles:manage
 */
router.patch(
  "/:id",
  requirePermission("roles:manage"),
  SystemRoleController.update,
);

/**
 * DELETE /system-roles/:id
 * Remove um role (não pode ser isSystem).
 * Requer: roles:manage
 */
router.delete(
  "/:id",
  requirePermission("roles:manage"),
  SystemRoleController.remove,
);

// ─── Permissões de um Role ────────────────────────────────────────────────────

/**
 * POST /system-roles/:id/permissions
 * Adiciona uma permissão a um role.
 * Body: { permissionId: string }
 * Requer: roles:manage
 */
router.post(
  "/:id/permissions",
  requirePermission("roles:manage"),
  SystemRoleController.attachPermission,
);

/**
 * DELETE /system-roles/:id/permissions/:permissionId
 * Remove uma permissão de um role.
 * Requer: roles:manage
 */
router.delete(
  "/:id/permissions/:permissionId",
  requirePermission("roles:manage"),
  SystemRoleController.detachPermission,
);

export default router;