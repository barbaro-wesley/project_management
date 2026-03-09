import { prisma } from "@infra/database/prisma.client";
import { NotFoundError, ForbiddenError } from "@shared/errors/app.error";
import { EventPublisher, type BoardEvent } from "@infra/redis/event-publisher";
import type { CreateColumnDto, UpdateColumnDto, ReorderColumnsDto } from "./column.dto";

async function findOrThrow(columnId: string) {
  const col = await prisma.column.findUnique({
    where: { id: columnId },
    select: { id: true, boardId: true, name: true, color: true, position: true },
  });
  if (!col) throw new NotFoundError("Coluna");
  return col;
}

// ─── Column ───────────────────────────────────────────────────────────────────

export async function createColumn(
  boardId: string,
  dto: CreateColumnDto,
  events: EventPublisher
) {
  // Próxima posição = maior posição atual + 1
  const last = await prisma.column.findFirst({
    where: { boardId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const position = last ? last.position + 1 : 0;

  const column = await prisma.column.create({
    data: { boardId, name: dto.name, color: dto.color, position },
    select: { id: true, boardId: true, name: true, color: true, position: true },
  });

  await events.publishToBoard(boardId, "column:created", column);
  return column;
}

export async function updateColumn(
  columnId: string,
  dto: UpdateColumnDto,
  events: EventPublisher
) {
  const col = await findOrThrow(columnId);

  const updated = await prisma.column.update({
    where: { id: columnId },
    data: dto,
    select: { id: true, boardId: true, name: true, color: true, position: true },
  });

  await events.publishToBoard(col.boardId, "column:created", updated);
  return updated;
}

export async function deleteColumn(columnId: string, events: EventPublisher) {
  const col = await findOrThrow(columnId);

  await prisma.$transaction(async (tx) => {
    // Move tasks órfãs para a primeira coluna do board
    const firstCol = await tx.column.findFirst({
      where: { boardId: col.boardId, id: { not: columnId } },
      orderBy: { position: "asc" },
      select: { id: true },
    });

    if (firstCol) {
      await tx.task.updateMany({
        where: { columnId },
        data: { columnId: firstCol.id },
      });
    }

    await tx.column.delete({ where: { id: columnId } });

    // Reordena posições para fechar o gap
    const remaining = await tx.column.findMany({
      where: { boardId: col.boardId },
      orderBy: { position: "asc" },
      select: { id: true },
    });

    await Promise.all(
      remaining.map((c, idx) =>
        tx.column.update({ where: { id: c.id }, data: { position: idx } })
      )
    );
  });

  await events.publishToBoard(col.boardId, "column:reordered", { deletedColumnId: columnId });
}

export async function reorderColumns(
  boardId: string,
  dto: ReorderColumnsDto,
  events: EventPublisher
) {
  await prisma.$transaction(async (tx) => {
    // 1. Move todas as colunas para posições temporárias negativas
    //    para evitar conflito de unique constraint durante a reordenação
    await tx.column.updateMany({
      where: { boardId },
      data: { position: { decrement: 10000 } },
    });

    // 2. Aplica as novas posições sequencialmente
    for (const { id, position } of dto.columns) {
      await tx.column.update({
        where: { id, boardId },
        data: { position },
      });
    }
  });

  await events.publishToBoard(boardId, "column:reordered", { columns: dto.columns });
  return dto.columns;
}

export async function listColumns(boardId: string) {
  return prisma.column.findMany({
    where: { boardId },
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
      position: true,
      _count: { select: { tasks: true } },
    },
  });
}