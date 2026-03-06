import { prisma } from "@infra/database/prisma.client";
import type { CreateUserDto, UpdateUserDto, ListUsersDto } from "./dtos/user.dto";

// ─── Selects reutilizáveis ────────────────────────────────────────────────────

/** Campos públicos/seguros de um usuário — nunca expõe passwordHash */
const PUBLIC_SELECT = {
  id:           true,
  name:         true,
  email:        true,
  avatarUrl:    true,
  isVerified:   true,
  lastActiveAt: true,
  createdAt:    true,
  updatedAt:    true,
} as const;

/** Inclui os system roles e permissões do usuário */
const WITH_ROLES = {
  ...PUBLIC_SELECT,
  systemRoles: {
    select: {
      grantedAt: true,
      role: {
        select: {
          id:          true,
          name:        true,
          description: true,
          permissions: {
            select: {
              permission: {
                select: { id: true, action: true, group: true, description: true },
              },
            },
          },
        },
      },
    },
  },
} as const;

// ─── Repository ───────────────────────────────────────────────────────────────

export async function findById(id: string) {
  return prisma.user.findUnique({
    where:  { id },
    select: PUBLIC_SELECT,
  });
}

export async function findByIdWithRoles(id: string) {
  return prisma.user.findUnique({
    where:  { id },
    select: WITH_ROLES,
  });
}

export async function findByEmail(email: string) {
  return prisma.user.findUnique({
    where:  { email },
    select: PUBLIC_SELECT,
  });
}

export async function findMany(dto: ListUsersDto) {
  const { page, limit, search, isVerified } = dto;
  const skip = (page - 1) * limit;

  const where = {
    ...(search && {
      OR: [
        { name:  { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(isVerified !== undefined && { isVerified }),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select:  PUBLIC_SELECT,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function create(dto: CreateUserDto, passwordHash: string) {
  return prisma.user.create({
    data: {
      name:         dto.name,
      email:        dto.email,
      passwordHash,
      avatarUrl:    dto.avatarUrl,
    },
    select: PUBLIC_SELECT,
  });
}

export async function update(id: string, dto: UpdateUserDto) {
  return prisma.user.update({
    where:  { id },
    data:   dto,
    select: PUBLIC_SELECT,
  });
}

export async function remove(id: string) {
  return prisma.user.delete({ where: { id } });
}

export async function emailExists(email: string): Promise<boolean> {
  const count = await prisma.user.count({ where: { email } });
  return count > 0;
}

// ─── System Roles ─────────────────────────────────────────────────────────────

export async function assignSystemRole(
  userId:    string,
  roleId:    string,
  grantedBy: string,
) {
  return prisma.userSystemRole.upsert({
    where:  { userId_roleId: { userId, roleId } },
    create: { userId, roleId, grantedBy },
    update: { grantedBy }, // atualiza quem concedeu se já existia
  });
}

export async function revokeSystemRole(userId: string, roleId: string) {
  return prisma.userSystemRole.delete({
    where: { userId_roleId: { userId, roleId } },
  });
}

export async function findUserSystemRoles(userId: string) {
  return prisma.userSystemRole.findMany({
    where: { userId },
    select: {
      grantedAt: true,
      grantedBy: true,
      role: {
        select: {
          id:          true,
          name:        true,
          description: true,
          permissions: {
            select: {
              permission: {
                select: { id: true, action: true, group: true },
              },
            },
          },
        },
      },
    },
  });
}