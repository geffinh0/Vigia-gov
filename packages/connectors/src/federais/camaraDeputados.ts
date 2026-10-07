import type { Connector, FonteDadosDescriptor, PessoaDTO, SyncResult } from "../types.js";
import { emptySyncResult } from "../types.js";
import { fetchJson } from "../httpClient.js";

/**
 * Conector oficial: API de Dados Abertos da Câmara dos Deputados.
 * Documentação: https://dadosabertos.camara.leg.br/swagger/api.html
 * Sem autenticação, sem chave de API.
 */

const BASE_URL = "https://dadosabertos.camara.leg.br/api/v2";

interface DeputadoResumo {
  id: number;
  nome: string;
  siglaPartido: string;
  siglaUf: string;
  uri: string;
}

interface DeputadoDetalhe {
  id: number;
  nomeCivil: string;
  cpf?: string;
  dataNascimento?: string;
  ultimoStatus: {
    nome: string;
    siglaPartido: string;
    siglaUf: string;
    situacao: string;
    data: string;
    idLegislatura: number;
  };
}

interface DespesaDeputado {
  ano: number;
  mes: number;
  tipoDespesa: string;
  valorLiquido: number;
}

/** Legislatura 57 = 2023–2027. Cada legislatura dura 4 anos a partir daí. */
function anosDaLegislatura(idLegislatura: number): { inicio: number; fim: number } {
  const inicio = 2023 + (idLegislatura - 57) * 4;
  return { inicio, fim: inicio + 4 };
}

function maskCpf(cpf?: string): string | undefined {
  if (!cpf || cpf.length < 11) return undefined;
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

async function listarDeputadosAtuais(): Promise<DeputadoResumo[]> {
  const todos: DeputadoResumo[] = [];
  let pagina = 1;
  const itensPorPagina = 100;
  for (;;) {
    const resp = await fetchJson<{ dados: DeputadoResumo[]; links: { rel: string }[] }>(
      `${BASE_URL}/deputados?itens=${itensPorPagina}&pagina=${pagina}&ordem=ASC&ordenarPor=nome`,
    );
    todos.push(...resp.dados);
    const temProxima = resp.links.some((l) => l.rel === "next");
    if (!temProxima || resp.dados.length === 0) break;
    pagina += 1;
  }
  return todos;
}

async function detalharDeputado(id: number): Promise<DeputadoDetalhe> {
  const resp = await fetchJson<{ dados: DeputadoDetalhe }>(`${BASE_URL}/deputados/${id}`);
  return resp.dados;
}

async function despesasDeputado(id: number, ano: number): Promise<DespesaDeputado[]> {
  const todas: DespesaDeputado[] = [];
  let pagina = 1;
  for (;;) {
    const resp = await fetchJson<{ dados: DespesaDeputado[]; links: { rel: string }[] }>(
      `${BASE_URL}/deputados/${id}/despesas?ano=${ano}&itens=100&pagina=${pagina}`,
    );
    todas.push(...resp.dados);
    const temProxima = resp.links.some((l) => l.rel === "next");
    if (!temProxima || resp.dados.length === 0) break;
    pagina += 1;
  }
  return todas;
}

export const camaraDeputadosConnector: Connector = {
  id: "camara-deputados",
  nome: "Câmara dos Deputados — Dados Abertos",

  fonte(): FonteDadosDescriptor {
    return {
      nome: "Câmara dos Deputados — Dados Abertos",
      orgaoResponsavel: "Câmara dos Deputados",
      esfera: "FEDERAL",
      url: "https://dadosabertos.camara.leg.br",
      tipoAcesso: "API_OFICIAL",
    };
  },

  async sync({ anoEleicao } = {}): Promise<SyncResult> {
    const resultado = emptySyncResult();
    const resumos = await listarDeputadosAtuais();
    const anoDespesas = anoEleicao ?? new Date().getFullYear();

    for (const resumo of resumos) {
      const detalhe = await detalharDeputado(resumo.id);
      const { inicio, fim } = anosDaLegislatura(detalhe.ultimoStatus.idLegislatura);

      const pessoa: PessoaDTO = {
        idExterno: `camara:${detalhe.id}`,
        nome: detalhe.nomeCivil || resumo.nome,
        cpfMascarado: maskCpf(detalhe.cpf),
        dataNascimento: detalhe.dataNascimento,
      };
      resultado.pessoas.push(pessoa);

      resultado.mandatos.push({
        pessoa,
        orgao: {
          nome: "Câmara dos Deputados",
          sigla: "CD",
          esfera: "FEDERAL",
        },
        cargo: "DEPUTADO_FEDERAL",
        uf: detalhe.ultimoStatus.siglaUf,
        partido: detalhe.ultimoStatus.siglaPartido,
        legislaturaInicio: inicio,
        legislaturaFim: fim,
        dataInicio: detalhe.ultimoStatus.data,
        idExterno: `camara:${detalhe.id}`,
      });

      try {
        const despesas = await despesasDeputado(detalhe.id, anoDespesas);
        const porMes = new Map<string, number>();
        for (const d of despesas) {
          const chave = `${d.ano}-${d.mes}`;
          porMes.set(chave, (porMes.get(chave) ?? 0) + d.valorLiquido);
        }
        for (const [chave, valor] of porMes) {
          const [ano, mes] = chave.split("-").map(Number);
          resultado.remuneracoes.push({
            pessoaIdExterno: pessoa.idExterno,
            orgaoNome: "Câmara dos Deputados",
            competenciaAno: ano,
            competenciaMes: mes,
            tipo: "COTA_PARLAMENTAR",
            valor,
          });
        }
      } catch {
        // Despesas indisponíveis para o período não interrompem a sincronização do mandato.
      }
    }

    return resultado;
  },
};
