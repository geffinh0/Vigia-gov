import type { NextFunction, Request, Response } from "express";
import { env } from "../env.js";

export function exigirChaveAdmin(req: Request, res: Response, next: NextFunction) {
  const chave = req.header("x-admin-key");
  if (chave !== env.ADMIN_API_KEY) {
    res.status(401).json({ erro: "Chave de administração ausente ou inválida" });
    return;
  }
  next();
}
