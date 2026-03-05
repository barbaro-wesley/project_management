import { prisma } from "@infra/database/prisma.client";
import { EventPublisher } from "@infra/redis/event-publisher";
import { enqueueTaskMovedNotification } from "@infra/queue/notification.queue";
import { NotFoundError, ForbiddenError } from "@shared/errors/app.error";
import * as TaskRepo from "./task.repository";
import type { CreateTaskDto, UpdateTaskDto, MoveTaskDto, TaskFiltersDto } from "./dtos/task.dto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findColumnWithBoard(columnId: string) {
  const col = await prisma.column.findUnique({
    where:  { id: columnId },
    select: { id: true, boardId: true },
  });
  if (!col) throw new NotFoundError("Coluna");
  return col;
}

async function findTaskOrThrow(taskId: string) {
  const task = await TaskRepo.findTaskById(taskId);
  if (!task) throw new NotFoundError("Task");
  return task;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function createTask(
  columnId: string,
  creatorId: string,
  dto: CreateTaskDto,
  events: EventPublisher
) {
  const col  = await findColumnWithBoard(columnId);
  const task = await TaskRepo.createTask(columnId, creatorId, dto);

  await events.publishToBoard(col.boardId, "task:created", { task, columnId });
  return task;
}

export async function getTask(taskId: string) {
  return findTaskOrThrow(taskId);
}

export async function listTasks(columnId: string, filters: TaskFiltersDto) {
  await findColumnWithBoard(columnId);
  return TaskRepo.findTasksByColumn(columnId, filters);
}

export async function updateTask(
  taskId: string,
  dto: UpdateTaskDto,
  events: EventPublisher
) {
  await findTaskOrThrow(taskId);
  const updated = await TaskRepo.updateTask(taskId, dto);

  // Busca o boardId pelo columnId da task atualizada
  const col = await findColumnWithBoard(updated.columnId);
  await events.publishToBoard(col.boardId, "task:updated", { task: updated });

  return updated;
}

export async function deleteTask(
  taskId: string,
  actorId: string,
  events: EventPublisher
) {
  const task = await findTaskOrThrow(taskId);
  const col  = await findColumnWithBoard(task.columnId);

  // Apenas o criador ou um OWNER do board pode deletar
  const isCreator = task.creator.id === actorId;
  if (!isCreator) throw new ForbiddenError("Apenas o criador pode deletar esta task");

  await TaskRepo.deleteTask(taskId);
  await events.publishToBoard(col.boardId, "task:deleted", { taskId, columnId: task.columnId });
}

export async function moveTask(
  taskId: string,
  actorId: string,
  dto: MoveTaskDto,
  events: EventPublisher
) {
  // Valida coluna de destino e obtém boardId
  const targetCol = await findColumnWithBoard(dto.targetColumnId);

  const { task, fromColumnId } = await TaskRepo.moveTask(
    taskId,
    dto.targetColumnId,
    dto.position,
    actorId
  );

  // Payload completo para o frontend atualizar o estado sem refetch
  const payload = {
    taskId,
    task,
    fromColumnId,
    toColumnId: dto.targetColumnId,
    position:   dto.position,
    movedBy:    actorId,
  };

  // Emite evento realtime para todos no board
  await events.publishToBoard(targetCol.boardId, "task:moved", payload);

  // Enfileira notificações para os assignees (assíncrono, não bloqueia)
  const assigneeIds = task.assignees.map(a => a.user.id);
  if (assigneeIds.length) {
    await enqueueTaskMovedNotification({ taskId, assigneeIds, movedBy: actorId });
  }

  return task;
}