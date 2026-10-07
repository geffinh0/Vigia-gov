import type { Connector } from "./types.js";
import { camaraDeputadosConnector } from "./federais/camaraDeputados.js";
import { senadoFederalConnector } from "./federais/senadoFederal.js";
import { criarConectorTse } from "./federais/tseDadosAbertos.js";

/**
 * Registro central de conectores. O scheduler (apps/api/src/jobs) itera
 * sobre `conectoresFederais` para a sincronização recorrente padrão, e
 * `criarConectoresEleitorais` para sincronizações pontuais de um ano
 * eleitoral específico (acionadas automaticamente em anos de eleição —
 * veja apps/api/src/jobs/scheduler.ts).
 *
 * Conectores estaduais entram aqui conforme forem implementados — veja
 * README.md deste pacote para o guia de contribuição por estado.
 */
export const conectoresFederais: Connector[] = [camaraDeputadosConnector, senadoFederalConnector];

export function criarConectoresEleitorais(anoEleicao: number): Connector[] {
  return [criarConectorTse({ anoEleicao })];
}

export const conectoresEstaduais: Connector[] = [
  // Ex.: alAssembleiaConnector, spAlespConnector, ...
  // Adicione aqui a implementação de cada estado à medida que for criada.
];

export function todosConectores(anoEleicaoAtual?: number): Connector[] {
  return [
    ...conectoresFederais,
    ...conectoresEstaduais,
    ...(anoEleicaoAtual ? criarConectoresEleitorais(anoEleicaoAtual) : []),
  ];
}
