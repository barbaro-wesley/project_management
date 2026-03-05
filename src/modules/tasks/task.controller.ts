import type { Request, Response, NextFunction } from "express";
import * as TaskService from "./task.service";
import {
  createTaskDto,
  updateTaskDto,
  moveTaskDto,
  taskFiltersDto,
} from "./dtos/task.dto";
import type { EventPublisher } from "@infra/redis/event-publisher";

function getEvents(req: Request): EventPublisher {
  return req.app.get("events") as EventPublisher;
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const dto  = createTaskDto.parse(req.body);
    const task = await TaskService.createTask(
      req.params.columnId,
      req.user.id,
      dto,
      getEvents(req)
    );
    res.status(201).json({ status: "ok", data: task });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = taskFiltersDto.parse(req.query);
    const result  = await TaskService.listTasks(req.params.columnId, filters);
    res.json({ status: "ok", ...result });
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await TaskService.getTask(req.params.taskId);
    res.json({ status: "ok", data: task });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const dto  = updateTaskDto.parse(req.body);
    const task = await TaskService.updateTask(req.params.taskId, dto, getEvents(req));
    res.json({ status: "ok", data: task });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await TaskService.deleteTask(req.params.taskId, req.user.id, getEvents(req));
    res.status(204).send();
  } catch (err) { next(err); }
}

export async function move(req: Request, res: Response, next: NextFunction) {
  try {
    const dto  = moveTaskDto.parse(req.body);
    const task = await TaskService.moveTask(
      req.params.taskId,
      req.user.id,
      dto,
      getEvents(req)
    );
    res.json({ status: "ok", data: task });
  } catch (err) { next(err); }
}