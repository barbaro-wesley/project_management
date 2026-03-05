
// ── src/shared/middlewares/error-handler.ts ───────────────────────────────────
import type { Request, Response, NextFunction } from "express";
import { AppError } from "@shared/errors/app.error";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Erros de validação (Zod)
  if (err instanceof ZodError) {
    return res.status(422).json({
      status: "error",
      code: "VALIDATION_ERROR",
      errors: err.flatten().fieldErrors,
    });
  }

  // Erros de negócio conhecidos
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      code: err.code,
      message: err.message,
    });
  }

  // Unique constraint do Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        status: "error",
        code: "CONFLICT",
        message: "Resource already exists",
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        status: "error",
        code: "NOT_FOUND",
        message: "Record not found",
      });
    }
  }

  // Fallback — erro inesperado
  console.error("Unhandled error:", err);
  return res.status(500).json({
    status: "error",
    code: "INTERNAL_ERROR",
    message: "Internal server error",
  });
}