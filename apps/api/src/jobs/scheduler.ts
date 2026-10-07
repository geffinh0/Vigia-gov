import cron from "node-cron";
import { conectoresFederais, criarConectoresEleitorais } from "@vigia-gov/connectors";
import { env } from "../env.js";
import { sincronizarConector } from "../services/ingestao.js";
import { identificarSugestoesDeParentesco, registrarSugestoesComoParentesco } from "../services/nepotismo.js";

/**
 * Agendador de sincronização automática.
 *
 * - Fontes federais (Câmara, Senado): recorrência diária (`SYNC_CRON_FEDERAL`).
 * - Fonte eleitoral (TSE): não roda em cron fixo — eleições no Brasil têm
 *   datas conhecidas com anos de antecedência (municipais em anos pares
 *   múltiplos de 4, gerais nos demais pares), então o próprio agendador
 *   decide se o ano corrente é ano eleitoral e, se for, inclui o conector
 *   do TSE na rotina diária a partir de 1º de outubro (período de
 *   divulgação de candidaturas e resultados) até o fim do ano.
 */

function ehAnoEleitoral(ano: number): boolean {
  return ano % 2 === 0;
}

function deveSincronizarEleicaoHoje(hoje: Date): boolean {
  return ehAnoEleitoral(hoje.getFullYear()) && hoje.getMonth() >= 9; // outubro em diante
}

export async function executarSincronizacaoDiaria() {
  const resultados: { conector: string; ok: boolean }[] = [];

  for (const conector of conectoresFederais) {
    const resultado = await sincronizarConector(conector);
    resultados.push({ conector: conector.id, ok: resultado.ok });
  }

  const hoje = new Date();
  const anoEleicao = env.ANO_ELEICAO_ATUAL ?? hoje.getFullYear();
  if (deveSincronizarEleicaoHoje(hoje) || env.ANO_ELEICAO_ATUAL) {
    for (const conector of criarConectoresEleitorais(anoEleicao)) {
      const resultado = await sincronizarConector(conector, { anoEleicao });
      resultados.push({ conector: conector.id, ok: resultado.ok });
    }
  }

  const sugestoes = await identificarSugestoesDeParentesco();
  await registrarSugestoesComoParentesco(sugestoes);

  return resultados;
}

export function iniciarAgendador() {
  cron.schedule(env.SYNC_CRON_FEDERAL, () => {
    executarSincronizacaoDiaria().catch((err) => {
      console.error("[scheduler] falha na sincronização agendada:", err);
    });
  });
  console.log(`[scheduler] sincronização automática agendada (cron: "${env.SYNC_CRON_FEDERAL}")`);
}
