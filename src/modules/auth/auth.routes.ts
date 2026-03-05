import { Router } from "express";
import * as AuthController from "./auth.controller";
import { authGuard } from "@shared/middlewares/auth.guard";

const router = Router();

router.post("/register", authGuard,AuthController.register);
router.post("/login",    AuthController.login);
router.post("/refresh", authGuard, AuthController.refresh);   // usa cookie refresh_token
router.post("/logout",  authGuard, AuthController.logout);
router.get("/me",        authGuard, AuthController.me);

export default router;