import { Prisma } from "@prisma/client";
import { prisma } from "@infra/database/prisma.client";
import type { CreateTaskDto, UpdateTaskDto, TaskFiltersDto } from "./dtos/task.dto";

// ─── Select reutilizável ──────────────────────────────────────────────────────

export const taskSelect = {
  id:          true,
  title:       true,
  description: true,
  priority:    true,
  status:      true,
  position:    true,
  dueDate:     true,
  coverUrl:    true,
  columnId:    true,
  createdAt:   true,
  updatedAt:   true,
  creator: {
    select: { id: true, name: true, avatarUrl: true },
  },
  assignees: {
    select: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
  labels: {
    select: {
      label: { select: { id: true, name: true, color: true } },
    },
  },
  _count: { select: { attachments: true, comments: true } },
} as const;

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createTask(
  columnId: string,
  creatorId: string,
  dto: CreateTaskDto
) {
  // Próxima posição na coluna
  const last = await prisma.task.findFirst({
    where:   { columnId },
    orderBy: { position: "desc" },
    select:  { position: true },
  });
  const position = last ? last.position + 1 : 0;

  return prisma.task.create({
    data: {
      columnId,
      creatorId,
      title:       dto.title,
      description: dto.description,
      priority:    dto.priority,
      position,
      dueDate:     dto.dueDate ? new Date(dto.dueDate) : undefined,
      assignees: dto.assigneeIds?.length
        ? { create: dto.assigneeIds.map(userId => ({ userId })) }
        : undefined,
      labels: dto.labelIds?.length
        ? { create: dto.labelIds.map(labelId => ({ labelId })) }
        : undefined,
    },
    select: taskSelect,
  });
}

export async function findTaskById(taskId: string) {
  return prisma.task.findUnique({
    where:  { id: taskId },
    select: taskSelect,
  });
}

export async function findTasksByColumn(
  columnId: string,
  filters: TaskFiltersDto
) {
  const where: Prisma.TaskWhereInput = {
    columnId,
    isArchived: false,
    ...(filters.priority   && { priority: filters.priority }),
    ...(filters.status     && { status:   filters.status }),
    ...(filters.assigneeId && {
      assignees: { some: { userId: filters.assigneeId } },
    }),
    ...(filters.search && {
      title: { contains: filters.search, mode: "insensitive" },
    }),
  };

  const [tasks, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      select:  taskSelect,
      orderBy: { position: "asc" },
      skip:    (filters.page - 1) * filters.limit,
      take:    filters.limit,
    }),
    prisma.task.count({ where }),
  ]);

  return { tasks, total, page: filters.page, limit: filters.limit };
}

export async function updateTask(taskId: string, dto: UpdateTaskDto) {
  const { assigneeIds, labelIds, dueDate, ...rest } = dto;

  return prisma.task.update({
    where: { id: taskId },
    data: {
      ...rest,
      dueDate: dueDate === null ? null : dueDate ? new Date(dueDate) : undefined,

      // Substitui assignees por completo se enviado
      ...(assigneeIds && {
        assignees: {
          deleteMany: {},
          create: assigneeIds.map(userId => ({ userId })),
        },
      }),

      // Substitui labels por completo se enviado
      ...(labelIds && {
        labels: {
          deleteMany: {},
          create: labelIds.map(labelId => ({ labelId })),
        },
      }),
    },
    select: taskSelect,
  });
}

export async function deleteTask(taskId: string) {
  return prisma.task.delete({ where: { id: taskId } });
}

// ─── Move ─────────────────────────────────────────────────────────────────────

export async function moveTask(
  taskId: string,
  targetColumnId: string,
  newPosition: number,
  actorId: string
) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.findUniqueOrThrow({
      where:  { id: taskId },
      select: { columnId: true, position: true },
    });

    const fromColumnId = task.columnId;
    const sameColumn   = fromColumnId === targetColumnId;

    // Fecha o gap na coluna de origem
    await tx.task.updateMany({
      where: { columnId: fromColumnId, position: { gt: task.position } },
      data:  { position: { decrement: 1 } },
    });

    // Abre espaço na coluna de destino
    await tx.task.updateMany({
      where: {
        columnId: targetColumnId,
        position: { gte: newPosition },
        // Se for mesma coluna, ignora a própria task
        ...(sameColumn && { id: { not: taskId } }),
      },
      data: { position: { increment: 1 } },
    });

    // Posiciona a task
    const updated = await tx.task.update({
      where:  { id: taskId },
      data:   { columnId: targetColumnId, position: newPosition },
      select: taskSelect,
    });

    // Registra no activity log
    await tx.activityLog.create({
      data: {
        taskId,
        boardId: undefined, // preenchido no service
        actorId,
        action:  "task.moved",
        metadata: {
          fromColumnId,
          toColumnId: targetColumnId,
          fromPosition: task.position,
          toPosition:   newPosition,
        },
      },
    });

    return { task: updated, fromColumnId };
  });
}