import { WorkspaceRole, BoardRole } from "@prisma/client";
import { prisma } from "@infra/database/prisma.client";
import { redisClient } from "@infra/redis/redis.client";

const CACHE_TTL = 60; // segundos

// ─── Workspace ────────────────────────────────────────────────────────────────

export async function getUserWorkspaceRole(
  userId: string,
  workspaceId: string
): Promise<WorkspaceRole | null> {
  const cacheKey = `perm:ws:${workspaceId}:${userId}`;

  // 1. Tenta cache
  const cached = await redisClient.get(cacheKey);
  if (cached) return cached as WorkspaceRole;

  // 2. Busca no banco
  const member = await prisma.workspaceMember.findUnique({
    where:  { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });

  if (!member) return null;

  // 3. Armazena no cache
  await redisClient.set(cacheKey, member.role, "EX", CACHE_TTL);

  return member.role;
}

// ─── Board ────────────────────────────────────────────────────────────────────

export async function getUserBoardRole(
  userId: string,
  boardId: string
): Promise<BoardRole | null> {
  const cacheKey = `perm:board:${boardId}:${userId}`;

  const cached = await redisClient.get(cacheKey);
  if (cached) return cached as BoardRole;

  const member = await prisma.boardMember.findUnique({
    where:  { boardId_userId: { boardId, userId } },
    select: { role: true },
  });

  if (!member) return null;

  await redisClient.set(cacheKey, member.role, "EX", CACHE_TTL);

  return member.role;
}

// ─── Invalidação de cache ─────────────────────────────────────────────────────
// Deve ser chamado sempre que um papel for alterado ou membro removido.

export async function invalidateWorkspacePermissionCache(
  userId: string,
  workspaceId: string
) {
  await redisClient.del(`perm:ws:${workspaceId}:${userId}`);
}

export async function invalidateBoardPermissionCache(
  userId: string,
  boardId: string
) {
  await redisClient.del(`perm:board:${boardId}:${userId}`);
}