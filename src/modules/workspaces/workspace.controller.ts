import type { Request, Response, NextFunction } from "express";
import * as WorkspaceService from "./workspace.service";
import {
  createWorkspaceDto,
  updateWorkspaceDto,
  updateMemberRoleDto,
} from "./workspace.dto";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const dto       = createWorkspaceDto.parse(req.body);
    const workspace = await WorkspaceService.createWorkspace(req.user.id, dto);
    res.status(201).json({ status: "ok", data: workspace });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaces = await WorkspaceService.listUserWorkspaces(req.user.id);
    res.json({ status: "ok", data: workspaces });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const workspace = await WorkspaceService.getWorkspace(req.params.workspaceId);
    res.json({ status: "ok", data: workspace });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const dto       = updateWorkspaceDto.parse(req.body);
    const workspace = await WorkspaceService.updateWorkspace(req.params.workspaceId, dto);
    res.json({ status: "ok", data: workspace });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await WorkspaceService.deleteWorkspace(req.params.workspaceId, req.user.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

// ─── Membros ──────────────────────────────────────────────────────────────────

export async function getMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const members = await WorkspaceService.listMembers(req.params.workspaceId);
    res.json({ status: "ok", data: members });
  } catch (err) { next(err); }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    const dto    = updateMemberRoleDto.parse(req.body);
    const result = await WorkspaceService.updateMemberRole(
      req.params.workspaceId,
      req.params.userId,
      req.user.id,
      dto
    );
    res.json({ status: "ok", data: result });
  } catch (err) { next(err); }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    await WorkspaceService.removeMember(
      req.params.workspaceId,
      req.params.userId,
      req.user.id
    );
    res.status(204).send();
  } catch (err) { next(err); }
}