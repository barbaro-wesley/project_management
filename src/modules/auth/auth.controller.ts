import type { Request, Response, NextFunction } from "express";
import * as AuthService from "./auth.service";
import { registerDto, loginDto } from "./dtos/auth.dto";
import { env } from "@config/env";

// ─── Configuração dos cookies ─────────────────────────────────────────────────

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   env.NODE_ENV === "production",  // HTTPS apenas em prod
  sameSite: "strict" as const,
};

function setAuthCookies(res: Response, tokens: AuthService.TokenPair) {
  res.cookie("access_token", tokens.accessToken, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 minutos em ms
  });

  res.cookie("refresh_token", tokens.refreshToken, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias em ms
    path:   "/api/auth/refresh",       // cookie só enviado nessa rota
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token", { path: "/api/auth/refresh" });
}

// ─── Handlers ────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const dto  = registerDto.parse(req.body);
    const user = await AuthService.registerUser(dto);
    res.status(201).json({ status: "ok", data: user });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const dto    = loginDto.parse(req.body);
    const tokens = await AuthService.loginUser(dto);

    setAuthCookies(res, tokens);
    res.json({ status: "ok", message: "Login realizado com sucesso" });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.refresh_token as string | undefined;
    if (!token) {
      res.status(401).json({ status: "error", message: "Refresh token ausente" });
      return;
    }

    const tokens = await AuthService.refreshTokens(token);
    setAuthCookies(res, tokens);
    res.json({ status: "ok", message: "Tokens renovados" });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await AuthService.getMe(req.user!.id); // ← "!" aqui
    res.json({ status: "ok", data: user });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: Request, res: Response, next: NextFunction) {
  clearAuthCookies(res);
  res.json({ status: "ok", message: "Logout realizado com sucesso" });
}