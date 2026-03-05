import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@infra/database/prisma.client";
import { env } from "@config/env";
import { AppError } from "@shared/errors/app.error";
import type { RegisterDto, LoginDto } from "./dtos/auth.dto";

const SALT_ROUNDS = 12;

export interface TokenPair {
  accessToken:  string;
  refreshToken: string;
}

export interface JwtPayload {
  sub:   string; // userId
  email: string;
  iat?:  number;
  exp?:  number;
}

// ─── Helpers de token ────────────────────────────────────────────────────────

function signAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email } satisfies Omit<JwtPayload, "iat" | "exp">,
    env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

function signRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId },
    env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
}

// ─── Service ─────────────────────────────────────────────────────────────────

export async function registerUser(dto: RegisterDto) {
  const existing = await prisma.user.findUnique({ where: { email: dto.email } });
  if (existing) throw new AppError("E-mail já cadastrado", 409, "EMAIL_IN_USE");

  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: { name: dto.name, email: dto.email, passwordHash },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return user;
}

export async function loginUser(dto: LoginDto): Promise<TokenPair> {
  const user = await prisma.user.findUnique({ where: { email: dto.email } });
  if (!user) throw new AppError("Credenciais inválidas", 401, "INVALID_CREDENTIALS");

  const valid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!valid) throw new AppError("Credenciais inválidas", 401, "INVALID_CREDENTIALS");

  await prisma.user.update({
    where: { id: user.id },
    data:  { lastActiveAt: new Date() },
  });

  return {
    accessToken:  signAccessToken(user.id, user.email),
    refreshToken: signRefreshToken(user.id),
  };
}

export async function refreshTokens(token: string): Promise<TokenPair> {
  let payload: { sub: string };

  try {
    payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
  } catch {
    throw new AppError("Refresh token inválido ou expirado", 401, "INVALID_REFRESH_TOKEN");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw new AppError("Usuário não encontrado", 401, "INVALID_REFRESH_TOKEN");

  return {
    accessToken:  signAccessToken(user.id, user.email),
    refreshToken: signRefreshToken(user.id),
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true },
  });
  if (!user) throw new AppError("Usuário não encontrado", 404, "NOT_FOUND");
  return user;
}