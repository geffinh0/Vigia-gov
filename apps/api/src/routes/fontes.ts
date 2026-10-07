import { Router } from "express";
import { prisma } from "@vigia-gov/db";

export const fontesRouter = Router();

/** GET /fontes — catálogo de transparência: toda fonte usada pelo sistema */
fontesRouter.get("/", async (_req, res) => {
  const fontes = await prisma.fonteDados.findMany({
    orderBy: [{ esfera: "asc" }, { nome: "asc" }],
  });
  res.json({ dados: fontes });
});

/** GET /fontes/:id/sincronizacoes — histórico de execuções desta fonte */
fontesRouter.get("/:id/sincronizacoes", async (req, res) => {
  const sincronizacoes = await prisma.sincronizacaoLog.findMany({
    where: { fonteId: req.params.id },
    orderBy: { iniciadoEm: "desc" },
    take: 50,
  });
  res.json({ dados: sincronizacoes });
});
