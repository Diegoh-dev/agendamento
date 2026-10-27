import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";

function sendError(res: Response, status: number, message: string): void {
  res.status(status).json({
    error: {
      message,
      status,
    },
  });
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    sendError(res, err.status, err.message);
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    sendError(res, 400, "JSON inválido no corpo da requisição");
    return;
  }

  console.error(err);
  sendError(res, 500, "Erro interno do servidor");
}
