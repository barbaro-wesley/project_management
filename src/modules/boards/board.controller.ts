import type { Request, Response, NextFunction } from "express";
import * as BoardService from "./board.service";
import {
  createBoardDto,
  updateBoardDto,
  addBoardMemberDto,
  updateBoardMemberDto,
} from "./board.dto";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const dto   = createBoardDto.parse(req.body);
    const board = await BoardService.createBoard(req.user.id, dto);
    res.status(201).json({ status: "ok", data: board });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const boards = await BoardService.listBoards(req.params.workspaceId);
    res.json({ status: "ok", data: boards });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const board = await BoardService.getBoard(req.params.boardId);
    res.json({ status: "ok", data: board });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const dto   = updateBoardDto.parse(req.body);
    const board = await BoardService.updateBoard(req.params.boardId, dto);
    res.json({ status: "ok", data: board });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await BoardService.deleteBoard(req.params.boardId, req.user.id);
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function getMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const members = await BoardService.listMembers(req.params.boardId);
    res.json({ status: "ok", data: members });
  } catch (err) { next(err); }
}

export async function addMember(req: Request, res: Response, next: NextFunction) {
  try {
    const dto    = addBoardMemberDto.parse(req.body);
    const result = await BoardService.addMember(req.params.boardId, dto);
    res.status(201).json({ status: "ok", data: result });
  } catch (err) { next(err); }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    const dto    = updateBoardMemberDto.parse(req.body);
    const result = await BoardService.updateMemberRole(
      req.params.boardId,
      req.params.userId,
      req.user.id,
      dto
    );
    res.json({ status: "ok", data: result });
  } catch (err) { next(err); }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    await BoardService.removeMember(
      req.params.boardId,
      req.params.userId,
      req.user.id
    );
    res.status(204).send();
  } catch (err) { next(err); }
}