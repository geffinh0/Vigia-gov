import cors from "cors";
import express from "express";
import { politicosRouter } from "./routes/politicos.js";
import { parentescosRouter } from "./routes/parentescos.js";
import { fontesRouter } from "./routes/fontes.js";
import { adminRouter } from "./routes/admin.js";

export function criarApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/saude", (_req, res) => res.json({ status: "ok" }));

  app.use("/politicos", politicosRouter);
  app.use("/parentescos", parentescosRouter);
  app.use("/fontes", fontesRouter);
  app.use("/admin", adminRouter);

  app.use((_req, res) => {
    res.status(404).json({ erro: "Rota não encontrada" });
  });

  return app;
}
