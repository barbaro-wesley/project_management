import { WorkspaceRole } from "@prisma/client";
import { prisma } from "@infra/database/prisma.client";
import type { CreateWorkspaceDto, UpdateWorkspaceDto } from "./workspace.dto";

// ─── Selects reutilizáveis ────────────────────────────────────────────────────

const workspaceSelect = {
  id:          true,
  name:        true,
  slug:        true,
  description: true,
  logoUrl:     true,
  ownerId:     true,
  createdAt:   true,
} as const;

const memberSelect = {
  role:     true,
  joinedAt: true,
  user: {
    select: { id: true, name: true, email: true, avatarUrl: true },
  },
} as const;

// ─── Workspace ────────────────────────────────────────────────────────────────

export async function createWorkspace(
  ownerId: string,
  dto: CreateWorkspaceDto,
  slug: string
) {
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data:   { ...dto, slug, ownerId },
      select: workspaceSelect,
    });

    // Owner automaticamente vira membro OWNER
    await tx.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: ownerId, role: WorkspaceRole.OWNER },
    });

    return workspace;
  });
}

export async function findWorkspaceById(id: string) {
  return prisma.workspace.findUnique({
    where:  { id },
    select: workspaceSelect,
  });
}

export async function findWorkspaceBySlug(slug: string) {
  return prisma.workspace.findUnique({
    where:  { slug },
    select: workspaceSelect,
  });
}

export async function findWorkspacesByUser(userId: string) {
  return prisma.workspace.findMany({
    where: {
      members: { some: { userId } },
    },
    select: {
      ...workspaceSelect,
      _count: { select: { members: true, boards: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateWorkspace(id: string, dto: UpdateWorkspaceDto) {
  return prisma.workspace.update({
    where:  { id },
    data:   dto,
    select: workspaceSelect,
  });
}

export async function deleteWorkspace(id: string) {
  return prisma.workspace.delete({ where: { id } });
}

// ─── Membros ──────────────────────────────────────────────────────────────────

export async function findWorkspaceMembers(workspaceId: string) {
  return prisma.workspaceMember.findMany({
    where:   { workspaceId },
    select:  memberSelect,
    orderBy: { joinedAt: "asc" },
  });
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
) {
  return prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId } },
    data:  { role },
  });
}

export async function removeMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}