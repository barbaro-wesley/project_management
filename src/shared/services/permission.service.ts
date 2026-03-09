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
    where: { workspaceId_userId: { workspaceId, userId } },
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

  // 1. Verifica membro direto do board
  const boardMember = await prisma.boardMember.findUnique({
    where: { boardId_userId: { boardId, userId } },
    select: { role: true },
  });

  if (boardMember) {
    await redisClient.set(cacheKey, boardMember.role, "EX", CACHE_TTL);
    return boardMember.role;
  }

  // 2. Fallback: OWNER/ADMIN do workspace têm papel OWNER no board automaticamente
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { workspaceId: true },
  });

  if (board) {
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: board.workspaceId, userId } },
      select: { role: true },
    });

    if (
      workspaceMember?.role === WorkspaceRole.OWNER ||
      workspaceMember?.role === WorkspaceRole.ADMIN
    ) {
      await redisClient.set(cacheKey, BoardRole.OWNER, "EX", CACHE_TTL);
      return BoardRole.OWNER;
    }
  }

  return null;
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