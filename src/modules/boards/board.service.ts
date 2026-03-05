import { BoardRole } from "@prisma/client";
import * as BoardRepo from "./board.repository";
import { NotFoundError, ForbiddenError } from "@shared/errors/app.error";
import { getUserWorkspaceRole } from "@shared/services/permission.service";
import { invalidateBoardPermissionCache } from "@shared/services/permission.service";
import type {
  CreateBoardDto,
  UpdateBoardDto,
  AddBoardMemberDto,
  UpdateBoardMemberDto,
} from "./board.dto";

async function findOrThrow(boardId: string) {
  const board = await BoardRepo.findBoardById(boardId);
  if (!board) throw new NotFoundError("Board");
  return board;
}

// ─── Board ────────────────────────────────────────────────────────────────────

export async function createBoard(userId: string, dto: CreateBoardDto) {
  // Usuário precisa ser membro do workspace para criar board
  const wsRole = await getUserWorkspaceRole(userId, dto.workspaceId);
  if (!wsRole) throw new ForbiddenError("Você não é membro deste workspace");
  return BoardRepo.createBoard(userId, dto);
}

export async function getBoard(boardId: string) {
  return findOrThrow(boardId);
}

export async function listBoards(workspaceId: string) {
  return BoardRepo.findBoardsByWorkspace(workspaceId);
}

export async function updateBoard(boardId: string, dto: UpdateBoardDto) {
  await findOrThrow(boardId);
  return BoardRepo.updateBoard(boardId, dto);
}

export async function deleteBoard(boardId: string, userId: string) {
  const board = await findOrThrow(boardId);

  const member = await BoardRepo.findBoardMembers(boardId)
    .then(ms => ms.find(m => m.user.id === userId));

  if (!member || member.role !== BoardRole.OWNER) {
    throw new ForbiddenError("Apenas o owner pode deletar o board");
  }

  await BoardRepo.deleteBoard(boardId);
}

// ─── Membros ──────────────────────────────────────────────────────────────────

export async function listMembers(boardId: string) {
  await findOrThrow(boardId);
  return BoardRepo.findBoardMembers(boardId);
}

export async function addMember(boardId: string, dto: AddBoardMemberDto) {
  await findOrThrow(boardId);
  return BoardRepo.upsertBoardMember(boardId, dto.userId, dto.role);
}

export async function updateMemberRole(
  boardId: string,
  targetUserId: string,
  actorId: string,
  dto: UpdateBoardMemberDto
) {
  await findOrThrow(boardId);

  if (targetUserId === actorId) {
    throw new ForbiddenError("Você não pode alterar seu próprio papel");
  }

  if (dto.role === BoardRole.OWNER) {
    throw new ForbiddenError("Use a função de transferência de ownership");
  }

  const updated = await BoardRepo.upsertBoardMember(boardId, targetUserId, dto.role);
  await invalidateBoardPermissionCache(targetUserId, boardId);
  return updated;
}

export async function removeMember(
  boardId: string,
  targetUserId: string,
  actorId: string
) {
  const board = await findOrThrow(boardId);
  const members = await BoardRepo.findBoardMembers(boardId);

  const target = members.find(m => m.user.id === targetUserId);
  if (!target) throw new NotFoundError("Membro");

  if (target.role === BoardRole.OWNER) {
    throw new ForbiddenError("Não é possível remover o owner do board");
  }

  const isSelf = targetUserId === actorId;
  if (!isSelf) {
    const actor = members.find(m => m.user.id === actorId);
    if (!actor || actor.role === BoardRole.VIEWER) {
      throw new ForbiddenError("Sem permissão para remover membros");
    }
  }

  await BoardRepo.removeBoardMember(boardId, targetUserId);
  await invalidateBoardPermissionCache(targetUserId, boardId);
}