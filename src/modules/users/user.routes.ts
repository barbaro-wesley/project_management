import { Router } from "express";
import multer from "multer";
import { authGuard } from "@shared/middlewares/auth.guard";
import { requirePermission } from "@shared/middlewares/require-permission.middleware";
import * as UserController from "./user.controller";

const router = Router();

// ─── Multer — avatar upload ───────────────────────────────────────────────────

const avatarUpload = multer({
  storage: multer.memoryStorage(), // buffer direto, sem tocar no disco
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB máximo
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Formato inválido. Use JPEG, PNG ou WebP"));
    }
  },
});

// Todas as rotas exigem autenticação
router.use(authGuard);

// ─── Usuários ─────────────────────────────────────────────────────────────────

/**
 * GET /users
 * Lista todos os usuários com paginação e filtros.
 * Requer: users:read
 */
router.get(
  "/",
  requirePermission("users:read"),
  UserController.list,
);

/**
 * GET /users/:id
 * Retorna um usuário pelo ID com seus system roles.
 * Requer: users:read
 */
router.get(
  "/:id",
  requirePermission("users:read"),
  UserController.getOne,
);

/**
 * POST /users
 * Cria um novo usuário (criação administrativa, diferente do register público).
 * Requer: users:create
 */
router.post(
  "/",
  requirePermission("users:create"),
  UserController.create,
);

/**
 * PATCH /users/:id
 * Atualiza dados de um usuário.
 * Requer: users:update  OU  ser o próprio usuário (verificado no service).
 *
 * Nota: para o próprio usuário editar seu perfil, use PATCH /auth/me
 * Esta rota é administrativa.
 */
router.patch(
  "/:id",
  requirePermission("users:update"),
  UserController.update,
);

/**
 * DELETE /users/:id
 * Remove um usuário do sistema.
 * Requer: users:delete
 */
router.delete(
  "/:id",
  requirePermission("users:delete"),
  UserController.remove,
);

// ─── Avatar do próprio usuário ────────────────────────────────────────────────

/**
 * PATCH /users/me/avatar
 * Faz upload do avatar do usuário autenticado.
 * Corpo: multipart/form-data com campo "avatar"
 * - Converte para WebP 256x256 automaticamente
 * - Substitui o avatar anterior se existir
 */
router.patch(
  "/me/avatar",
  avatarUpload.single("avatar"),
  UserController.uploadAvatar,
);

/**
 * DELETE /users/me/avatar
 * Remove o avatar do usuário autenticado.
 */
router.delete(
  "/me/avatar",
  UserController.removeAvatar,
);

// ─── System Roles do Usuário ──────────────────────────────────────────────────

/**
 * GET /users/:id/roles
 * Lista os system roles atribuídos a um usuário.
 * Requer: roles:assign (quem pode gerenciar roles pode visualizá-los)
 */
router.get(
  "/:id/roles",
  requirePermission("roles:assign"),
  UserController.getRoles,
);

/**
 * POST /users/:id/roles
 * Atribui um system role a um usuário.
 * Body: { roleId: string }
 * Requer: roles:assign
 */
router.post(
  "/:id/roles",
  requirePermission("roles:assign"),
  UserController.assignRole,
);

/**
 * DELETE /users/:id/roles/:roleId
 * Remove um system role de um usuário.
 * Requer: roles:assign
 */
router.delete(
  "/:id/roles/:roleId",
  requirePermission("roles:assign"),
  UserController.revokeRole,
);

export default router;