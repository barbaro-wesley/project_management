import { prisma } from "@infra/database/prisma.client";
import type {
  CreateSystemRoleDto,
  UpdateSystemRoleDto,
  ListSystemRolesDto,
  CreateSystemPermissionDto,
} from "./dtos/system-role.dto";

// ─── Selects reutilizáveis ────────────────────────────────────────────────────

const ROLE_WITH_PERMISSIONS = {
  id:          true,
  name:        true,
  description: true,
  isSystem:    true,
  createdAt:   true,
  updatedAt:   true,
  permissions: {
    select: {
      permission: {
        select: {
          id:          true,
          action:      true,
          group:       true,
          description: true,
        },
      },
    },
  },
} as const;

// ─── Roles ────────────────────────────────────────────────────────────────────

export async function findRoleById(id: string) {
  return prisma.systemRole.findUnique({
    where:  { id },
    select: ROLE_WITH_PERMISSIONS,
  });
}

export async function findRoleByName(name: string) {
  return prisma.systemRole.findUnique({
    where:  { name },
    select: ROLE_WITH_PERMISSIONS,
  });
}

export async function findManyRoles(dto: ListSystemRolesDto) {
  const { page, limit, search } = dto;
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { name:        { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [roles, total] = await prisma.$transaction([
    prisma.systemRole.findMany({
      where,
      select:  ROLE_WITH_PERMISSIONS,
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.systemRole.count({ where }),
  ]);

  return {
    data: roles,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export async function createRole(dto: CreateSystemRoleDto) {
  return prisma.systemRole.create({
    data:   { name: dto.name, description: dto.description },
    select: ROLE_WITH_PERMISSIONS,
  });
}

export async function updateRole(id: string, dto: UpdateSystemRoleDto) {
  return prisma.systemRole.update({
    where:  { id },
    data:   dto,
    select: ROLE_WITH_PERMISSIONS,
  });
}

export async function deleteRole(id: string) {
  return prisma.systemRole.delete({ where: { id } });
}

export async function roleNameExists(name: string): Promise<boolean> {
  const count = await prisma.systemRole.count({ where: { name } });
  return count > 0;
}

// ─── Permissions em um Role ───────────────────────────────────────────────────

export async function attachPermission(roleId: string, permissionId: string) {
  return prisma.systemRolePermission.create({
    data: { roleId, permissionId },
  });
}

export async function detachPermission(roleId: string, permissionId: string) {
  return prisma.systemRolePermission.delete({
    where: { roleId_permissionId: { roleId, permissionId } },
  });
}

export async function permissionAlreadyAttached(
  roleId:       string,
  permissionId: string,
): Promise<boolean> {
  const count = await prisma.systemRolePermission.count({
    where: { roleId, permissionId },
  });
  return count > 0;
}

// ─── Permissions (catálogo global) ───────────────────────────────────────────

export async function findAllPermissions() {
  return prisma.systemPermission.findMany({
    orderBy: [{ group: "asc" }, { action: "asc" }],
    select:  { id: true, action: true, group: true, description: true },
  });
}

export async function findPermissionById(id: string) {
  return prisma.systemPermission.findUnique({
    where:  { id },
    select: { id: true, action: true, group: true, description: true },
  });
}

export async function findPermissionByAction(action: string) {
  return prisma.systemPermission.findUnique({
    where:  { action },
    select: { id: true, action: true, group: true, description: true },
  });
}

export async function createPermission(dto: CreateSystemPermissionDto) {
  return prisma.systemPermission.create({
    data:   dto,
    select: { id: true, action: true, group: true, description: true },
  });
}

export async function deletePermission(id: string) {
  return prisma.systemPermission.delete({ where: { id } });
}