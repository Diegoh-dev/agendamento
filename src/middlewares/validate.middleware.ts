import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../errors/app-error.js";

export function validate(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Requisição inválida";
      next(new AppError(message, 400));
      return;
    }

    const data = result.data as { body?: unknown };

    if (data.body !== undefined) {
      req.body = data.body;
    }

    next();
  };
}
