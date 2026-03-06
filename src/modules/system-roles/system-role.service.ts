import { AppError } from "@shared/errors/app.error";
import * as SystemRoleRepository from "./system-role.repository";
import type {
  CreateSystemRoleDto,
  UpdateSystemRoleDto,
  ManagePermissionDto,
  CreateSystemPermissionDto,
  ListSystemRolesDto,
} from "./dtos/system-role.dto";

// ─── Roles ────────────────────────────────────────────────────────────────────

export async function listRoles(dto: ListSystemRolesDto) {
  return SystemRoleRepository.findManyRoles(dto);
}

export async function getRoleById(id: string) {
  const role = await SystemRoleRepository.findRoleById(id);
  if (!role) throw new AppError("Role não encontrado", 404, "NOT_FOUND");
  return role;
}

export async function createRole(dto: CreateSystemRoleDto) {
  const exists = await SystemRoleRepository.roleNameExists(dto.name);
  if (exists) throw new AppError("Já existe um role com este nome", 409, "ROLE_NAME_IN_USE");

  return SystemRoleRepository.createRole(dto);
}

export async function updateRole(id: string, dto: UpdateSystemRoleDto) {
  const role = await SystemRoleRepository.findRoleById(id);
  if (!role) throw new AppError("Role não encontrado", 404, "NOT_FOUND");

  if (role.isSystem) {
    throw new AppError(
      "Roles de sistema não podem ser modificados",
      403,
      "SYSTEM_ROLE_IMMUTABLE",
    );
  }

  // Verifica conflito de nome apenas se o nome está sendo alterado
  if (dto.name && dto.name !== role.name) {
    const exists = await SystemRoleRepository.roleNameExists(dto.name);
    if (exists) throw new AppError("Já existe um role com este nome", 409, "ROLE_NAME_IN_USE");
  }

  return SystemRoleRepository.updateRole(id, dto);
}

export async function deleteRole(id: string) {
  const role = await SystemRoleRepository.findRoleById(id);
  if (!role) throw new AppError("Role não encontrado", 404, "NOT_FOUND");

  if (role.isSystem) {
    throw new AppError(
      "Roles de sistema não podem ser deletados",
      403,
      "SYSTEM_ROLE_IMMUTABLE",
    );
  }

  await SystemRoleRepository.deleteRole(id);
}

// ─── Permissões de um Role ────────────────────────────────────────────────────

export async function attachPermissionToRole(
  roleId: string,
  dto:    ManagePermissionDto,
) {
  const role = await SystemRoleRepository.findRoleById(roleId);
  if (!role) throw new AppError("Role não encontrado", 404, "NOT_FOUND");

  if (role.isSystem) {
    throw new AppError(
      "Roles de sistema não podem ser modificados",
      403,
      "SYSTEM_ROLE_IMMUTABLE",
    );
  }

  const permission = await SystemRoleRepository.findPermissionById(dto.permissionId);
  if (!permission) throw new AppError("Permissão não encontrada", 404, "NOT_FOUND");

  const alreadyAttached = await SystemRoleRepository.permissionAlreadyAttached(
    roleId,
    dto.permissionId,
  );
  if (alreadyAttached) {
    throw new AppError("Permissão já atribuída a este role", 409, "PERMISSION_ALREADY_ATTACHED");
  }

  await SystemRoleRepository.attachPermission(roleId, dto.permissionId);

  // Retorna o role atualizado
  return SystemRoleRepository.findRoleById(roleId);
}

export async function detachPermissionFromRole(
  roleId:       string,
  permissionId: string,
) {
  const role = await SystemRoleRepository.findRoleById(roleId);
  if (!role) throw new AppError("Role não encontrado", 404, "NOT_FOUND");

  if (role.isSystem) {
    throw new AppError(
      "Roles de sistema não podem ser modificados",
      403,
      "SYSTEM_ROLE_IMMUTABLE",
    );
  }

  const attached = await SystemRoleRepository.permissionAlreadyAttached(roleId, permissionId);
  if (!attached) {
    throw new AppError("Permissão não está atribuída a este role", 404, "NOT_FOUND");
  }

  await SystemRoleRepository.detachPermission(roleId, permissionId);
}

// ─── Catálogo de Permissões ───────────────────────────────────────────────────

export async function listPermissions() {
  return SystemRoleRepository.findAllPermissions();
}

export async function createPermission(dto: CreateSystemPermissionDto) {
  const exists = await SystemRoleRepository.findPermissionByAction(dto.action);
  if (exists) {
    throw new AppError("Já existe uma permissão com esta action", 409, "PERMISSION_ACTION_IN_USE");
  }

  return SystemRoleRepository.createPermission(dto);
}

export async function deletePermission(id: string) {
  const permission = await SystemRoleRepository.findPermissionById(id);
  if (!permission) throw new AppError("Permissão não encontrada", 404, "NOT_FOUND");

  await SystemRoleRepository.deletePermission(id);
}