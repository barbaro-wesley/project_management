import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "@config/env";
import type { JwtPayload } from "@modules/auth/auth.service";

export function authGuard(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.access_token as string | undefined;

  if (!token) {
    res.status(401).json({ status: "error", code: "MISSING_TOKEN", message: "Não autenticado" });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ status: "error", code: "INVALID_TOKEN", message: "Token inválido ou expirado" });
  }
}