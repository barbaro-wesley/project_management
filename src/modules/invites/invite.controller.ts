import type { Request, Response, NextFunction } from "express";
import * as InviteService from "./invite.service";
import { createInviteDto, acceptInviteDto } from "./invite.dto";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const dto    = createInviteDto.parse(req.body);
    const invite = await InviteService.createInvite(
      req.params.workspaceId,
      req.user.id,
      dto
    );
    res.status(201).json({ status: "ok", data: invite });
  } catch (err) { next(err); }
}

export async function accept(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = acceptInviteDto.parse(req.query);
    const result    = await InviteService.acceptInvite(token, req.user.id);
    res.json({ status: "ok", data: result });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const invites = await InviteService.listInvites(req.params.workspaceId);
    res.json({ status: "ok", data: invites });
  } catch (err) { next(err); }
}

export async function revoke(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await InviteService.revokeInvite(
      req.params.inviteId,
      req.params.workspaceId
    );
    res.json({ status: "ok", data: result });
  } catch (err) { next(err); }
}