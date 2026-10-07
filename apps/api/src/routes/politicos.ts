import { Router } from "express";
import { prisma } from "@vigia-gov/db";

export const politicosRouter = Router();

/** GET /politicos?nome=&uf=&cargo=&partido=&pagina=&itens= */
politicosRouter.get("/", async (req, res) => {
  const { nome, uf, cargo, partido } = req.query as Record<string, string | undefined>;
  const pagina = Math.max(1, Number(req.query.pagina) || 1);
  const itens = Math.min(100, Math.max(1, Number(req.query.itens) || 20));

  const mandatoFiltro = {
    some: {
      ...(uf ? { uf } : {}),
      ...(cargo ? { cargo: cargo as never } : {}),
      ...(partido ? { partido } : {}),
    },
  };

  const where = {
    ehPolitico: true,
    ...(nome ? { nome: { contains: nome, mode: "insensitive" as const } } : {}),
    ...(uf || cargo || partido ? { mandatos: mandatoFiltro } : {}),
  };

  const [total, pessoas] = await Promise.all([
    prisma.pessoa.count({ where }),
    prisma.pessoa.findMany({
      where,
      skip: (pagina - 1) * itens,
      take: itens,
      orderBy: { nome: "asc" },
      include: {
        mandatos: {
          orderBy: { dataInicio: "desc" },
          take: 1,
          include: { orgao: true },
        },
      },
    }),
  ]);

  res.json({
    pagina,
    itens,
    total,
    totalPaginas: Math.ceil(total / itens),
    dados: pessoas,
  });
});

/** GET /politicos/:id — perfil completo */
politicosRouter.get("/:id", async (req, res) => {
  const pessoa = await prisma.pessoa.findUnique({
    where: { id: req.params.id },
    include: {
      mandatos: { include: { orgao: true, fonte: true }, orderBy: { dataInicio: "desc" } },
      remuneracoes: { include: { orgao: true }, orderBy: [{ competenciaAno: "desc" }, { competenciaMes: "desc" }] },
      candidaturas: { include: { eleicao: true, bensDeclarados: true }, orderBy: { createdAt: "desc" } },
      nomeacoesFeitas: { include: { titular: true, orgao: true }, orderBy: { dataInicio: "desc" } },
      parentescosOrigem: { include: { pessoaB: true, fonte: true } },
      parentescosDestino: { include: { pessoaA: true, fonte: true } },
    },
  });

  if (!pessoa) {
    res.status(404).json({ erro: "Pessoa não encontrada" });
    return;
  }

  const parentescos = [
    ...pessoa.parentescosOrigem.map((p) => ({
      pessoa: p.pessoaB,
      grau: p.grau,
      origem: p.origem,
      confianca: p.confianca,
      fonte: p.fonte,
    })),
    ...pessoa.parentescosDestino.map((p) => ({
      pessoa: p.pessoaA,
      grau: p.grau,
      origem: p.origem,
      confianca: p.confianca,
      fonte: p.fonte,
    })),
  ];

  const { parentescosOrigem, parentescosDestino, ...resto } = pessoa;
  res.json({ ...resto, parentescos });
});
