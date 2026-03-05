
// ── src/modules/attachments/attachment.controller.ts ─────────────────────────
import type { Request, Response, NextFunction } from "express";
import * as AttachmentService from "./attachment.service";
import { AppError } from "@shared/errors/app.error";
import type { EventPublisher } from "@infra/redis/event-publisher";

function getEvents(req: Request): EventPublisher {
  return req.app.get("events") as EventPublisher;
}

export async function upload(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new AppError("Nenhum arquivo enviado", 400, "NO_FILES");
    }

    const attachments = await AttachmentService.uploadAttachments(
      req.params.taskId,
      req.user.id,
      req.files,
      getEvents(req)
    );

    res.status(201).json({ status: "ok", data: attachments });
  } catch (err) { next(err); }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const attachments = await AttachmentService.listAttachments(req.params.taskId);
    res.json({ status: "ok", data: attachments });
  } catch (err) { next(err); }
}

export async function download(req: Request, res: Response, next: NextFunction) {
  try {
    const { buffer, filename, mimeType } = await AttachmentService.downloadAttachment(
      req.params.attachmentId
    );

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader("Content-Length", buffer.length);
    res.end(buffer);
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await AttachmentService.deleteAttachment(
      req.params.attachmentId,
      req.user.id,
      getEvents(req)
    );
    res.status(204).send();
  } catch (err) { next(err); }
}
