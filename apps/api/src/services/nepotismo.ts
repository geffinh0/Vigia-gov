import { prisma } from "@vigia-gov/db";

/**
 * Motor heurístico de sugestão de parentesco entre quem ocupa um cargo
 * comissionado/de gabinete e quem o nomeou. Isto é deliberadamente apenas
 * uma SUGESTÃO: toda saída é gravada com `origem: INFERENCIA_AUTOMATICA` e
 * `confianca: BAIXA`, e a UI deve sempre rotular isso como "possível
 * parentesco a confirmar" — nunca como fato. Confirmação definitiva exige
 * curadoria manual (atualizando `origem` para `CURADORIA_MANUAL` e
 * `confianca` para o nível apropriado) ou uma fonte oficial que declare o
 * vínculo (ex: decisão judicial, declaração do próprio órgão).
 *
 * Sobrenomes comuns (ex: "Silva", "Souza", "Oliveira") são explicitamente
 * excluídos da heurística por gerarem falsos positivos em volume alto.
 */

const SOBRENOMES_MUITO_COMUNS = new Set([
  "SILVA",
  "SOUZA",
  "SOUSA",
  "OLIVEIRA",
  "SANTOS",
  "PEREIRA",
  "FERREIRA",
  "ALVES",
  "COSTA",
  "RODRIGUES",
  "ALMEIDA",
  "NASCIMENTO",
  "LIMA",
  "ARAUJO",
  "ARAÚJO",
  "FERNANDES",
  "CARVALHO",
  "GOMES",
  "MARTINS",
  "ROCHA",
  "RIBEIRO",
  "BARBOSA",
  "FREITAS",
]);

function sobrenomesRelevantes(nomeCompleto: string): string[] {
  return nomeCompleto
    .trim()
    .split(/\s+/)
    .map((parte) => parte.toUpperCase())
    .filter((parte) => parte.length > 2 && !SOBRENOMES_MUITO_COMUNS.has(parte));
}

function compartilhaSobrenomeRaro(nomeA: string, nomeB: string): string | null {
  const a = new Set(sobrenomesRelevantes(nomeA));
  const b = sobrenomesRelevantes(nomeB);
  for (const sobrenome of b) {
    if (a.has(sobrenome)) return sobrenome;
  }
  return null;
}

export interface SugestaoParentesco {
  pessoaAId: string;
  pessoaBId: string;
  sobrenomeCompartilhado: string;
  cargoComissionadoId: string;
}

/**
 * Varre cargos comissionados com `nomeadoPor` preenchido e devolve pares
 * titular/nomeante que compartilham um sobrenome pouco comum. Não grava
 * nada sozinho — veja `registrarSugestoesComoParentesco`.
 */
export async function identificarSugestoesDeParentesco(): Promise<SugestaoParentesco[]> {
  const cargos = await prisma.cargoComissionado.findMany({
    where: { nomeadoPorId: { not: null } },
    include: { titular: true, nomeadoPor: true },
  });

  const sugestoes: SugestaoParentesco[] = [];
  for (const cargo of cargos) {
    if (!cargo.nomeadoPor) continue;
    if (cargo.titularId === cargo.nomeadoPorId) continue;

    const sobrenome = compartilhaSobrenomeRaro(cargo.titular.nome, cargo.nomeadoPor.nome);
    if (!sobrenome) continue;

    sugestoes.push({
      pessoaAId: cargo.titularId,
      pessoaBId: cargo.nomeadoPor.id,
      sobrenomeCompartilhado: sobrenome,
      cargoComissionadoId: cargo.id,
    });
  }
  return sugestoes;
}

/**
 * Persiste as sugestões como `Parentesco` de baixíssima confiança, para
 * curadoria humana posterior. Fonte usada: uma FonteDados sintética
 * "Inferência automática — sobrenome" (criada se não existir), já que não
 * há um documento oficial por trás da sugestão.
 */
export async function registrarSugestoesComoParentesco(sugestoes: SugestaoParentesco[]) {
  if (sugestoes.length === 0) return { criados: 0 };

  const fonte = await prisma.fonteDados.upsert({
    where: { nome: "Inferência automática — sobrenome" },
    update: {},
    create: {
      nome: "Inferência automática — sobrenome",
      orgaoResponsavel: "Vigia-Gov (heurística interna)",
      esfera: "FEDERAL",
      url: "internal://nepotismo/sobrenome",
      tipoAcesso: "SCRAPING",
      confiavel: false,
    },
  });

  let criados = 0;
  for (const s of sugestoes) {
    const existente = await prisma.parentesco.findFirst({
      where: {
        OR: [
          { pessoaAId: s.pessoaAId, pessoaBId: s.pessoaBId },
          { pessoaAId: s.pessoaBId, pessoaBId: s.pessoaAId },
        ],
      },
    });
    if (existente) continue;

    await prisma.parentesco.create({
      data: {
        pessoaAId: s.pessoaAId,
        pessoaBId: s.pessoaBId,
        grau: "OUTRO",
        origem: "INFERENCIA_AUTOMATICA",
        confianca: "BAIXA",
        observacoes: `Sobrenome "${s.sobrenomeCompartilhado}" em comum entre titular de cargo comissionado e quem o nomeou. Requer curadoria manual antes de ser tratado como confirmado.`,
        fonteId: fonte.id,
      },
    });
    criados += 1;
  }
  return { criados };
}
