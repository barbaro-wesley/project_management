import type { Request, Response, NextFunction } from "express";
import * as CommentService from "./comment.service";
import { createCommentDto, updateCommentDto, listCommentsDto } from "./dtos/comment.dto";
import type { EventPublisher } from "@infra/redis/event-publisher";

function getEvents(req: Request): EventPublisher {
  return req.app.get("events") as EventPublisher;
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const dto     = createCommentDto.parse(req.body);
    const comment = await CommentService.createComment(
      req.params.taskId,
      req.user.id,
      dto,
      getEvents(req)
    );
    res.status(201).json({ status: "ok", data: comment });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const dto    = listCommentsDto.parse(req.query);
    const result = await CommentService.listComments(req.params.taskId, dto);
    res.json({ status: "ok", ...result });
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const dto     = updateCommentDto.parse(req.body);
    const comment = await CommentService.updateComment(
      req.params.commentId,
      req.user.id,
      dto,
      getEvents(req)
    );
    res.json({ status: "ok", data: comment });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await CommentService.deleteComment(
      req.params.commentId,
      req.user.id,
      getEvents(req)
    );
    res.status(204).send();
  } catch (err) { next(err); }
}