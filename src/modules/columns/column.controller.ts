
// ── src/modules/columns/column.controller.ts ─────────────────────────────────
import type { Request, Response, NextFunction } from "express";
import * as ColumnService from "./column.service";
import { createColumnDto, updateColumnDto, reorderColumnsDto } from "./column.dto";
import type { EventPublisher } from "@infra/redis/event-publisher";

function getEvents(req: Request): EventPublisher {
  return req.app.get("events") as EventPublisher;
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const dto    = createColumnDto.parse(req.body);
    const column = await ColumnService.createColumn(req.params.boardId, dto, getEvents(req));
    res.status(201).json({ status: "ok", data: column });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const dto    = updateColumnDto.parse(req.body);
    const column = await ColumnService.updateColumn(req.params.columnId, dto, getEvents(req));
    res.json({ status: "ok", data: column });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await ColumnService.deleteColumn(req.params.columnId, getEvents(req));
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function reorder(req: Request, res: Response, next: NextFunction) {
  try {
    const dto    = reorderColumnsDto.parse(req.body);
    const result = await ColumnService.reorderColumns(req.params.boardId, dto, getEvents(req));
    res.json({ status: "ok", data: result });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const columns = await ColumnService.listColumns(req.params.boardId);
    res.json({ status: "ok", data: columns });
  } catch (err) { next(err); }
}