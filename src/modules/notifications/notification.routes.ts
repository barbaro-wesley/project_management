import { Router } from "express";
import * as NotificationController from "./notification.controller";
import { authGuard } from "@shared/middlewares/auth.guard";

const router = Router();
router.use(authGuard);

router.get( "/",                            NotificationController.list);
router.patch("/read-all",                   NotificationController.markAllAsRead);
router.patch("/:notificationId/read",       NotificationController.markAsRead);
router.delete("/:notificationId",           NotificationController.remove);

export default router;