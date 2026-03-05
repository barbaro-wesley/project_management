import { WorkspaceRole } from "@prisma/client";
import * as WorkspaceRepo from "./workspace.repository";
import { AppError, NotFoundError, ForbiddenError } from "@shared/errors/app.error";
import {
  invalidateWorkspacePermissionCache,
} from "@shared/services/permission.service";
import type {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  UpdateMemberRoleDto,
} from "./workspace.dto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .concat("-", Math.random().toString(36).slice(2, 7)); // sufixo único
}

async function findOrThrow(workspaceId: string) {
  const ws = await WorkspaceRepo.findWorkspaceById(workspaceId);
  if (!ws) throw new NotFoundError("Workspace");
  return ws;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function createWorkspace(userId: string, dto: CreateWorkspaceDto) {
  const slug = generateSlug(dto.name);
  return WorkspaceRepo.createWorkspace(userId, dto, slug);
}

export async function listUserWorkspaces(userId: string) {
  return WorkspaceRepo.findWorkspacesByUser(userId);
}

export async function getWorkspace(workspaceId: string) {
  return findOrThrow(workspaceId);
}

export async function updateWorkspace(
  workspaceId: string,
  dto: UpdateWorkspaceDto
) {
  await findOrThrow(workspaceId);
  return WorkspaceRepo.updateWorkspace(workspaceId, dto);
}

export async function deleteWorkspace(workspaceId: string, userId: string) {
  const ws = await findOrThrow(workspaceId);

  if (ws.ownerId !== userId) {
    throw new ForbiddenError("Apenas o owner pode deletar o workspace");
  }

  await WorkspaceRepo.deleteWorkspace(workspaceId);
}

// ─── Membros ──────────────────────────────────────────────────────────────────

export async function listMembers(workspaceId: string) {
  await findOrThrow(workspaceId);
  return WorkspaceRepo.findWorkspaceMembers(workspaceId);
}

export async function updateMemberRole(
  workspaceId: string,
  targetUserId: string,
  actorId: string,
  dto: UpdateMemberRoleDto
) {
  const ws = await findOrThrow(workspaceId);

  // Owner não pode ter o papel alterado
  if (ws.ownerId === targetUserId) {
    throw new ForbiddenError("Não é possível alterar o papel do owner");
  }

  // Ninguém pode se promover
  if (targetUserId === actorId) {
    throw new ForbiddenError("Você não pode alterar seu próprio papel");
  }

  // Ninguém pode promover alguém para OWNER
  if (dto.role === WorkspaceRole.OWNER) {
    throw new AppError("Use a função de transferência de ownership", 400, "INVALID_ROLE");
  }

  const updated = await WorkspaceRepo.updateMemberRole(workspaceId, targetUserId, dto.role);
  await invalidateWorkspacePermissionCache(targetUserId, workspaceId);
  return updated;
}

export async function removeMember(
  workspaceId: string,
  targetUserId: string,
  actorId: string
) {
  const ws = await findOrThrow(workspaceId);

  if (ws.ownerId === targetUserId) {
    throw new ForbiddenError("Não é possível remover o owner do workspace");
  }

  // Membro pode sair por conta própria, ou ADMIN/OWNER remove outro
  const isSelf = targetUserId === actorId;
  if (!isSelf) {
    // A verificação de papel já foi feita pelo rbac.guard na rota
    // mas validamos novamente como camada de defesa
    const actor = await WorkspaceRepo.findWorkspaceMembers(workspaceId)
      .then(members => members.find(m => m.user.id === actorId));

    if (!actor || actor.role === WorkspaceRole.MEMBER || actor.role === WorkspaceRole.GUEST) {
      throw new ForbiddenError("Sem permissão para remover membros");
    }
  }

  await WorkspaceRepo.removeMember(workspaceId, targetUserId);
  await invalidateWorkspacePermissionCache(targetUserId, workspaceId);
}