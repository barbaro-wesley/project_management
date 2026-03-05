import type { Request, Response, NextFunction } from "express";
import * as NotificationService from "./notification.service";
import { listNotificationsDto } from "./dtos/notification.dto";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const dto    = listNotificationsDto.parse(req.query);
    const result = await NotificationService.listNotifications(req.user.id, dto);
    res.json({ status: "ok", ...result });
  } catch (err) { next(err); }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await NotificationService.markAsRead(
      req.params.notificationId,
      req.user.id
    );
    res.json({ status: "ok", data: result });
  } catch (err) { next(err); }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await NotificationService.markAllAsRead(req.user.id);
    res.json({ status: "ok", data: result });
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await NotificationService.deleteNotification(
      req.params.notificationId,
      req.user.id
    );
    res.status(204).send();
  } catch (err) { next(err); }
}