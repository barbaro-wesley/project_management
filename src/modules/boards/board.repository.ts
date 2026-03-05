import { BoardRole } from "@prisma/client";
import { prisma } from "@infra/database/prisma.client";
import type { CreateBoardDto, UpdateBoardDto } from "./board.dto";

const boardSelect = {
  id:          true,
  name:        true,
  description: true,
  coverUrl:    true,
  isArchived:  true,
  workspaceId: true,
  createdAt:   true,
  _count: { select: { columns: true, members: true } },
} as const;

// ─── Board ────────────────────────────────────────────────────────────────────

export async function createBoard(ownerId: string, dto: CreateBoardDto) {
  return prisma.$transaction(async (tx) => {
    const board = await tx.board.create({
      data:   { name: dto.name, description: dto.description, workspaceId: dto.workspaceId },
      select: boardSelect,
    });

    // Criador vira membro OWNER do board automaticamente
    await tx.boardMember.create({
      data: { boardId: board.id, userId: ownerId, role: BoardRole.OWNER },
    });

    // Cria colunas padrão
    await tx.column.createMany({
      data: [
        { boardId: board.id, name: "A Fazer",      color: "#6366f1", position: 0 },
        { boardId: board.id, name: "Em Progresso", color: "#f59e0b", position: 1 },
        { boardId: board.id, name: "Concluído",    color: "#10b981", position: 2 },
      ],
    });

    return board;
  });
}

export async function findBoardById(boardId: string) {
  return prisma.board.findUnique({
    where:  { id: boardId },
    select: {
      ...boardSelect,
      columns: {
        where:   { },
        orderBy: { position: "asc" },
        select: {
          id:       true,
          name:     true,
          color:    true,
          position: true,
          _count:   { select: { tasks: true } },
        },
      },
    },
  });
}

export async function findBoardsByWorkspace(workspaceId: string) {
  return prisma.board.findMany({
    where:   { workspaceId, isArchived: false },
    select:  boardSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function updateBoard(boardId: string, dto: UpdateBoardDto) {
  return prisma.board.update({
    where:  { id: boardId },
    data:   dto,
    select: boardSelect,
  });
}

export async function deleteBoard(boardId: string) {
  return prisma.board.delete({ where: { id: boardId } });
}

// ─── Membros ──────────────────────────────────────────────────────────────────

export async function findBoardMembers(boardId: string) {
  return prisma.boardMember.findMany({
    where:   { boardId },
    select: {
      role:     true,
      joinedAt: true,
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
}

export async function upsertBoardMember(
  boardId: string,
  userId: string,
  role: BoardRole
) {
  return prisma.boardMember.upsert({
    where:  { boardId_userId: { boardId, userId } },
    create: { boardId, userId, role },
    update: { role },
  });
}

export async function removeBoardMember(boardId: string, userId: string) {
  return prisma.boardMember.delete({
    where: { boardId_userId: { boardId, userId } },
  });
}