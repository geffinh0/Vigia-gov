import type { Connector, FonteDadosDescriptor, PessoaDTO, SyncResult } from "../types.js";
import { emptySyncResult } from "../types.js";
import { fetchJson } from "../httpClient.js";

/**
 * Conector oficial: Dados Abertos do Senado Federal.
 * Documentação: https://www12.senado.leg.br/dados-abertos
 * Sem autenticação. A API responde XML por padrão; usamos o sufixo
 * `.json` suportado pelo serviço para obter JSON diretamente.
 *
 * Observação de manutenção: o ambiente de desenvolvimento usado para
 * escrever este conector não tinha acesso de rede liberado para o host
 * legis.senado.leg.br (política da sandbox). Os campos abaixo seguem a
 * documentação oficial publicada; confira contra uma resposta real antes
 * do primeiro deploy e ajuste os caminhos se necessário.
 */

const BASE_URL = "https://legis.senado.leg.br/dadosabertos";

interface ParlamentarJson {
  IdentificacaoParlamentar: {
    CodigoParlamentar: string;
    NomeCompletoParlamentar: string;
    SiglaPartidoParlamentar: string;
    UfParlamentar: string;
  };
  Mandato?: {
    PrimeiraLegislaturaDoMandato?: { NumeroLegislatura: string; DataInicio?: string };
    SegundaLegislaturaDoMandato?: { NumeroLegislatura: string; DataFim?: string };
  };
}

interface ListaAtualResponse {
  ListaParlamentarEmExercicio?: {
    Parlamentares?: {
      Parlamentar?: ParlamentarJson[] | ParlamentarJson;
    };
  };
}

function asArray<T>(value: T[] | T | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export const senadoFederalConnector: Connector = {
  id: "senado-federal",
  nome: "Senado Federal — Dados Abertos",

  fonte(): FonteDadosDescriptor {
    return {
      nome: "Senado Federal — Dados Abertos",
      orgaoResponsavel: "Senado Federal",
      esfera: "FEDERAL",
      url: "https://www12.senado.leg.br/dados-abertos",
      tipoAcesso: "API_OFICIAL",
    };
  },

  async sync(): Promise<SyncResult> {
    const resultado = emptySyncResult();
    const resp = await fetchJson<ListaAtualResponse>(`${BASE_URL}/senador/lista/atual.json`);
    const parlamentares = asArray(resp.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar);

    for (const p of parlamentares) {
      const id = p.IdentificacaoParlamentar.CodigoParlamentar;
      const legislaturaInicio = Number(
        p.Mandato?.PrimeiraLegislaturaDoMandato?.NumeroLegislatura ?? 57,
      );
      const anoInicioLegislatura = 2023 + (legislaturaInicio - 57) * 4;

      const pessoa: PessoaDTO = {
        idExterno: `senado:${id}`,
        nome: p.IdentificacaoParlamentar.NomeCompletoParlamentar,
      };
      resultado.pessoas.push(pessoa);

      resultado.mandatos.push({
        pessoa,
        orgao: {
          nome: "Senado Federal",
          sigla: "SF",
          esfera: "FEDERAL",
        },
        cargo: "SENADOR",
        uf: p.IdentificacaoParlamentar.UfParlamentar,
        partido: p.IdentificacaoParlamentar.SiglaPartidoParlamentar,
        legislaturaInicio,
        legislaturaFim: legislaturaInicio + 1,
        dataInicio:
          p.Mandato?.PrimeiraLegislaturaDoMandato?.DataInicio ??
          `${anoInicioLegislatura}-02-01`,
        idExterno: `senado:${id}`,
      });
    }

    return resultado;
  },
};
