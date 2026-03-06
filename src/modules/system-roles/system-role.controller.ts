import type { Request, Response, NextFunction } from "express";
import * as SystemRoleService from "./system-role.service";
import {
  createSystemRoleDto,
  updateSystemRoleDto,
  managePermissionDto,
  createSystemPermissionDto,
  listSystemRolesDto,
} from "./dtos/system-role.dto";

// ─── Roles ────────────────────────────────────────────────────────────────────

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query  = listSystemRolesDto.parse(req.query);
    const result = await SystemRoleService.listRoles(query);
    res.json({ status: "ok", ...result });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const role = await SystemRoleService.getRoleById(req.params.id);
    res.json({ status: "ok", data: role });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const dto  = createSystemRoleDto.parse(req.body);
    const role = await SystemRoleService.createRole(dto);
    res.status(201).json({ status: "ok", data: role });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const dto  = updateSystemRoleDto.parse(req.body);
    const role = await SystemRoleService.updateRole(req.params.id, dto);
    res.json({ status: "ok", data: role });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await SystemRoleService.deleteRole(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Permissões de um Role ────────────────────────────────────────────────────

export async function attachPermission(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dto  = managePermissionDto.parse(req.body);
    const role = await SystemRoleService.attachPermissionToRole(req.params.id, dto);
    res.status(201).json({ status: "ok", data: role });
  } catch (err) {
    next(err);
  }
}

export async function detachPermission(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await SystemRoleService.detachPermissionFromRole(
      req.params.id,
      req.params.permissionId,
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Catálogo de Permissões ───────────────────────────────────────────────────

export async function listPermissions(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const permissions = await SystemRoleService.listPermissions();
    res.json({ status: "ok", data: permissions });
  } catch (err) {
    next(err);
  }
}

export async function createPermission(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const dto        = createSystemPermissionDto.parse(req.body);
    const permission = await SystemRoleService.createPermission(dto);
    res.status(201).json({ status: "ok", data: permission });
  } catch (err) {
    next(err);
  }
}

export async function deletePermission(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await SystemRoleService.deletePermission(req.params.permissionId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}