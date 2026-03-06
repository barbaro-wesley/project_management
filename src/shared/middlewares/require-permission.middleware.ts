import type { Request, Response, NextFunction } from "express";
import { prisma } from "@infra/database/prisma.client";

/**
 * Middleware que verifica se o usuário autenticado possui uma determinada
 * system permission, navegando pela cadeia:
 *
 *   User → UserSystemRole → SystemRole → SystemRolePermission → SystemPermission
 *
 * Deve ser usado APÓS o middleware `authenticate`, pois depende de `req.user`.
 *
 * @example
 * router.post("/users", authenticate, requirePermission("users:create"), handler)
 */
export function requirePermission(action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        status:  "error",
        message: "Não autenticado",
        code:    "UNAUTHENTICATED",
      });
      return;
    }

    try {
      const match = await prisma.userSystemRole.findFirst({
        where: {
          userId,
          role: {
            permissions: {
              some: {
                permission: { action },
              },
            },
          },
        },
        select: { userId: true }, // select mínimo — só precisamos saber se existe
      });

      if (!match) {
        res.status(403).json({
          status:  "error",
          message: "Você não tem permissão para realizar esta ação",
          code:    "FORBIDDEN",
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}