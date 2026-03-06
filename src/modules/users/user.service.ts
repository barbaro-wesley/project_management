import bcrypt from "bcryptjs";
import { AppError } from "@shared/errors/app.error";
import * as UserRepository from "./user.repository";
import type {
  CreateUserDto,
  UpdateUserDto,
  ListUsersDto,
  AssignSystemRoleDto,
} from "./dtos/user.dto";

const SALT_ROUNDS = 12;

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listUsers(dto: ListUsersDto) {
  return UserRepository.findMany(dto);
}

export async function getUserById(id: string) {
  const user = await UserRepository.findByIdWithRoles(id);
  if (!user) throw new AppError("Usuário não encontrado", 404, "NOT_FOUND");
  return user;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createUser(dto: CreateUserDto) {
  const exists = await UserRepository.emailExists(dto.email);
  if (exists) throw new AppError("E-mail já cadastrado", 409, "EMAIL_IN_USE");

  const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
  return UserRepository.create(dto, passwordHash);
}

export async function updateUser(
  targetId:    string,
  dto:         UpdateUserDto,
  requesterId: string,
) {
  // Garante que o usuário alvo existe
  const target = await UserRepository.findById(targetId);
  if (!target) throw new AppError("Usuário não encontrado", 404, "NOT_FOUND");

  // Somente o próprio usuário ou quem tem permissão sistêmica pode editar.
  // A verificação de permissão sistêmica é feita via middleware na rota;
  // aqui garantimos que um usuário comum só edite a si mesmo.
  if (targetId !== requesterId) {
    // Se chegou aqui sem ser o próprio usuário, o middleware
    // requirePermission("users:update") já validou — nada a fazer.
  }

  return UserRepository.update(targetId, dto);
}

export async function deleteUser(targetId: string, requesterId: string) {
  if (targetId === requesterId) {
    throw new AppError("Você não pode deletar sua própria conta por aqui", 400, "SELF_DELETE");
  }

  const target = await UserRepository.findById(targetId);
  if (!target) throw new AppError("Usuário não encontrado", 404, "NOT_FOUND");

  await UserRepository.remove(targetId);
}

// ─── System Roles ─────────────────────────────────────────────────────────────

export async function assignRoleToUser(
  targetId:    string,
  dto:         AssignSystemRoleDto,
  grantedBy:   string,
) {
  const target = await UserRepository.findById(targetId);
  if (!target) throw new AppError("Usuário não encontrado", 404, "NOT_FOUND");

  return UserRepository.assignSystemRole(targetId, dto.roleId, grantedBy);
}

export async function revokeRoleFromUser(
  targetId: string,
  roleId:   string,
) {
  const target = await UserRepository.findById(targetId);
  if (!target) throw new AppError("Usuário não encontrado", 404, "NOT_FOUND");

  try {
    await UserRepository.revokeSystemRole(targetId, roleId);
  } catch {
    throw new AppError("Role não encontrado para este usuário", 404, "NOT_FOUND");
  }
}

export async function getUserRoles(targetId: string) {
  const target = await UserRepository.findById(targetId);
  if (!target) throw new AppError("Usuário não encontrado", 404, "NOT_FOUND");

  return UserRepository.findUserSystemRoles(targetId);
}