import { Router } from "express";
import { prisma } from "@vigia-gov/db";

export const parentescosRouter = Router();

/**
 * GET /parentescos?confianca=ALTA,MEDIA&origem=CURADORIA_MANUAL
 * Grafo de possíveis vínculos de parentesco/nepotismo. Por padrão exclui
 * sugestões de baixa confiança ainda não curadas — passe
 * `incluirNaoConfirmados=true` para ver tudo, inclusive inferências
 * automáticas pendentes de revisão humana.
 */
parentescosRouter.get("/", async (req, res) => {
  const incluirNaoConfirmados = req.query.incluirNaoConfirmados === "true";

  const parentescos = await prisma.parentesco.findMany({
    where: incluirNaoConfirmados ? {} : { NOT: { confianca: "BAIXA" } },
    include: { pessoaA: true, pessoaB: true, fonte: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  res.json({ dados: parentescos });
});

/** PATCH /parentescos/:id/curadoria — confirma ou ajusta uma sugestão automática */
parentescosRouter.patch("/:id/curadoria", async (req, res) => {
  const { grau, confianca, observacoes } = req.body as {
    grau?: string;
    confianca?: "ALTA" | "MEDIA" | "BAIXA";
    observacoes?: string;
  };

  const atualizado = await prisma.parentesco.update({
    where: { id: req.params.id },
    data: {
      ...(grau ? { grau: grau as never } : {}),
      ...(confianca ? { confianca } : {}),
      ...(observacoes ? { observacoes } : {}),
      origem: "CURADORIA_MANUAL",
    },
  });

  res.json(atualizado);
});
