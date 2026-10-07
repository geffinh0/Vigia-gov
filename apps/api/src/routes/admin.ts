import { Router } from "express";
import { conectoresFederais, criarConectoresEleitorais } from "@vigia-gov/connectors";
import { exigirChaveAdmin } from "../middleware/auth.js";
import { sincronizarConector } from "../services/ingestao.js";
import { identificarSugestoesDeParentesco, registrarSugestoesComoParentesco } from "../services/nepotismo.js";

export const adminRouter = Router();
adminRouter.use(exigirChaveAdmin);

/** POST /admin/sync/federais — dispara manualmente a sincronização federal */
adminRouter.post("/sync/federais", async (_req, res) => {
  const resultados = [];
  for (const conector of conectoresFederais) {
    resultados.push({ conector: conector.id, ...(await sincronizarConector(conector)) });
  }
  res.json({ resultados });
});

/** POST /admin/sync/eleicao/:ano — dispara sincronização do TSE para um ano específico */
adminRouter.post("/sync/eleicao/:ano", async (req, res) => {
  const ano = Number(req.params.ano);
  if (!Number.isInteger(ano)) {
    res.status(400).json({ erro: "ano inválido" });
    return;
  }
  const resultados = [];
  for (const conector of criarConectoresEleitorais(ano)) {
    resultados.push({ conector: conector.id, ...(await sincronizarConector(conector, { anoEleicao: ano })) });
  }
  res.json({ resultados });
});

/** POST /admin/nepotismo/varrer — roda a heurística de sugestão de parentesco sob demanda */
adminRouter.post("/nepotismo/varrer", async (_req, res) => {
  const sugestoes = await identificarSugestoesDeParentesco();
  const resultado = await registrarSugestoesComoParentesco(sugestoes);
  res.json({ sugestoesEncontradas: sugestoes.length, ...resultado });
});
