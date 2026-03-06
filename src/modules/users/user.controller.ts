import type { Request, Response, NextFunction } from "express";
import * as UserService from "./user.service";
import {
  createUserDto,
  updateUserDto,
  listUsersDto,
  assignSystemRoleDto,
} from "./dtos/user.dto";

// ─── List ─────────────────────────────────────────────────────────────────────

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query  = listUsersDto.parse(req.query);
    const result = await UserService.listUsers(query);
    res.json({ status: "ok", ...result });
  } catch (err) {
    next(err);
  }
}

// ─── Get One ──────────────────────────────────────────────────────────────────

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await UserService.getUserById(req.params.id);
    res.json({ status: "ok", data: user });
  } catch (err) {
    next(err);
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const dto  = createUserDto.parse(req.body);
    const user = await UserService.createUser(dto);
    res.status(201).json({ status: "ok", data: user });
  } catch (err) {
    next(err);
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const dto  = updateUserDto.parse(req.body);
    const user = await UserService.updateUser(
      req.params.id,
      dto,
      req.user!.id,
    );
    res.json({ status: "ok", data: user });
  } catch (err) {
    next(err);
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await UserService.deleteUser(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── System Roles ─────────────────────────────────────────────────────────────

export async function getRoles(req: Request, res: Response, next: NextFunction) {
  try {
    const roles = await UserService.getUserRoles(req.params.id);
    res.json({ status: "ok", data: roles });
  } catch (err) {
    next(err);
  }
}

export async function assignRole(req: Request, res: Response, next: NextFunction) {
  try {
    const dto    = assignSystemRoleDto.parse(req.body);
    const result = await UserService.assignRoleToUser(
      req.params.id,
      dto,
      req.user!.id,
    );
    res.status(201).json({ status: "ok", data: result });
  } catch (err) {
    next(err);
  }
}

export async function revokeRole(req: Request, res: Response, next: NextFunction) {
  try {
    await UserService.revokeRoleFromUser(req.params.id, req.params.roleId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}