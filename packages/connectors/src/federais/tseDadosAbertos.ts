import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import type { CargoEletivo, Esfera } from "@vigia-gov/db";
import type {
  CandidaturaDTO,
  Connector,
  FonteDadosDescriptor,
  PessoaDTO,
  SyncResult,
} from "../types.js";
import { emptySyncResult } from "../types.js";
import { fetchBuffer } from "../httpClient.js";

/**
 * Conector oficial: Repositório de Dados Eleitorais do TSE (dados abertos,
 * sem autenticação, distribuído em lotes .zip por ano de eleição).
 * Documentação: https://dadosabertos.tse.jus.br
 *
 * Cobre candidaturas e bens declarados de TODOS os estados em uma única
 * fonte nacional — por isso é a base de "patrimônio declarado" e
 * "resultado da eleição" do sistema, complementando os conectores
 * estaduais (que focam em remuneração e cargos de gabinete, dados que o
 * TSE não possui).
 *
 * Observação de manutenção: o ambiente usado para escrever este conector
 * não tinha acesso de rede liberado para cdn.tse.jus.br (política da
 * sandbox). O layout das colunas segue o dicionário de dados oficial do
 * TSE (estável há vários pleitos); valide contra um arquivo real antes do
 * primeiro uso em produção.
 */

const CDN_BASE = "https://cdn.tse.jus.br/estatistica/sead/odsele";

const CARGO_MAP: Record<string, CargoEletivo> = {
  PRESIDENTE: "PRESIDENTE",
  "VICE-PRESIDENTE": "VICE_PRESIDENTE",
  GOVERNADOR: "GOVERNADOR",
  "VICE-GOVERNADOR": "VICE_GOVERNADOR",
  SENADOR: "SENADOR",
  "DEPUTADO FEDERAL": "DEPUTADO_FEDERAL",
  "DEPUTADO ESTADUAL": "DEPUTADO_ESTADUAL",
  "DEPUTADO DISTRITAL": "DEPUTADO_DISTRITAL",
  PREFEITO: "PREFEITO",
  "VICE-PREFEITO": "VICE_PREFEITO",
  VEREADOR: "VEREADOR",
};

const SITUACAO_CANDIDATURA_MAP: Record<string, CandidaturaDTO["situacaoCandidatura"]> = {
  DEFERIDO: "DEFERIDA",
  "DEFERIDO COM RECURSO": "DEFERIDA",
  INDEFERIDO: "INDEFERIDA",
  "INDEFERIDO COM RECURSO": "INDEFERIDA",
  CASSADO: "CASSADA",
  RENÚNCIA: "RENUNCIA",
};

const SITUACAO_FINAL_MAP: Record<string, CandidaturaDTO["situacaoFinal"]> = {
  ELEITO: "ELEITO",
  "ELEITO POR QP": "ELEITO",
  "ELEITO POR MÉDIA": "ELEITO_MEDIA",
  "NÃO ELEITO": "NAO_ELEITO",
  SUPLENTE: "SUPLENTE",
};

function maskCpf(cpf?: string): string | undefined {
  if (!cpf || cpf.length < 11) return undefined;
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

function parseLatin1Csv(buffer: Buffer): Record<string, string>[] {
  const texto = buffer.toString("latin1");
  return parse(texto, {
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  }) as Record<string, string>[];
}

function parseValorBr(valor: string | undefined): number | undefined {
  if (!valor) return undefined;
  const normalizado = valor.replace(/\./g, "").replace(",", ".");
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : undefined;
}

export interface TseSyncOptions {
  anoEleicao: number;
  /** Restringe a UFs específicas (ex: ["SP", "RJ"]). Padrão: todas. */
  ufs?: string[];
  /**
   * Restringe a cargos específicos. Padrão: cargos federais e estaduais —
   * eleições municipais têm ordens de grandeza maiores (~500k candidaturas)
   * e devem ser sincronizadas sob demanda por estado.
   */
  cargos?: CargoEletivo[];
}

const CARGOS_PADRAO: CargoEletivo[] = [
  "PRESIDENTE",
  "VICE_PRESIDENTE",
  "GOVERNADOR",
  "VICE_GOVERNADOR",
  "SENADOR",
  "DEPUTADO_FEDERAL",
  "DEPUTADO_ESTADUAL",
  "DEPUTADO_DISTRITAL",
];

async function baixarEExtrairZip(url: string): Promise<AdmZip.IZipEntry[]> {
  const buffer = await fetchBuffer(url, { timeoutMs: 120_000 });
  const zip = new AdmZip(buffer);
  return zip.getEntries().filter((e) => e.entryName.toLowerCase().endsWith(".csv"));
}

export function criarConectorTse(opts: TseSyncOptions): Connector {
  const cargosFiltro = new Set(opts.cargos ?? CARGOS_PADRAO);
  const ufsFiltro = opts.ufs ? new Set(opts.ufs.map((uf) => uf.toUpperCase())) : undefined;

  return {
    id: `tse-${opts.anoEleicao}`,
    nome: `TSE — Candidaturas e bens declarados ${opts.anoEleicao}`,

    fonte(): FonteDadosDescriptor {
      return {
        nome: `TSE — Dados Abertos (eleições ${opts.anoEleicao})`,
        orgaoResponsavel: "Tribunal Superior Eleitoral",
        esfera: "FEDERAL" as Esfera,
        url: "https://dadosabertos.tse.jus.br",
        tipoAcesso: "DOWNLOAD_CSV_OFICIAL",
      };
    },

    async sync(): Promise<SyncResult> {
      const resultado = emptySyncResult();
      const ano = opts.anoEleicao;

      const candEntries = await baixarEExtrairZip(
        `${CDN_BASE}/consulta_cand/consulta_cand_${ano}.zip`,
      );

      const candidaturaPorSequencial = new Map<string, CandidaturaDTO>();

      for (const entry of candEntries) {
        const linhas = parseLatin1Csv(entry.getData());
        for (const linha of linhas) {
          const uf = linha.SG_UF;
          if (ufsFiltro && !ufsFiltro.has(uf)) continue;

          const cargo = CARGO_MAP[linha.DS_CARGO?.toUpperCase()];
          if (!cargo || !cargosFiltro.has(cargo)) continue;

          const sequencial = linha.SQ_CANDIDATO;
          const pessoa: PessoaDTO = {
            idExterno: `tse:${sequencial}`,
            nome: linha.NM_CANDIDATO,
            nomeSocial: linha.NM_SOCIAL_CANDIDATO || undefined,
            cpfMascarado: maskCpf(linha.NR_CPF_CANDIDATO),
            dataNascimento: linha.DT_NASCIMENTO || undefined,
          };
          resultado.pessoas.push(pessoa);

          const situacaoCandidatura =
            SITUACAO_CANDIDATURA_MAP[linha.DS_SITUACAO_CANDIDATURA?.toUpperCase()] ??
            "EM_JULGAMENTO";
          const situacaoFinal = SITUACAO_FINAL_MAP[linha.DS_SIT_TOT_TURNO?.toUpperCase()];

          const candidatura: CandidaturaDTO = {
            pessoa,
            anoEleicao: ano,
            abrangencia: cargo === "PREFEITO" || cargo === "VICE_PREFEITO" || cargo === "VEREADOR"
              ? "MUNICIPAL"
              : cargo === "PRESIDENTE" || cargo === "VICE_PRESIDENTE" || cargo === "SENADOR"
                ? "FEDERAL"
                : "ESTADUAL",
            turno: Number(linha.NR_TURNO) || 1,
            cargoPretendido: cargo,
            uf,
            partido: linha.SG_PARTIDO,
            coligacao: linha.NM_COLIGACAO || undefined,
            numeroUrna: linha.NR_CANDIDATO,
            situacaoCandidatura,
            situacaoFinal,
            idExternoTse: sequencial,
            bensDeclarados: [],
          };
          resultado.candidaturas.push(candidatura);
          candidaturaPorSequencial.set(sequencial, candidatura);
        }
      }

      try {
        const bensEntries = await baixarEExtrairZip(
          `${CDN_BASE}/bem_candidato/bem_candidato_${ano}.zip`,
        );
        for (const entry of bensEntries) {
          const linhas = parseLatin1Csv(entry.getData());
          for (const linha of linhas) {
            const candidatura = candidaturaPorSequencial.get(linha.SQ_CANDIDATO);
            if (!candidatura) continue;
            const valor = parseValorBr(linha.VR_BEM_CANDIDATO);
            if (valor === undefined) continue;
            candidatura.bensDeclarados ??= [];
            candidatura.bensDeclarados.push({
              descricao: linha.DS_BEM_CANDIDATO || linha.DS_TIPO_BEM_CANDIDATO || "Bem declarado",
              valor,
            });
          }
        }
        for (const candidatura of candidaturaPorSequencial.values()) {
          candidatura.bensDeclaradosTotal = (candidatura.bensDeclarados ?? []).reduce(
            (soma, bem) => soma + bem.valor,
            0,
          );
        }
      } catch {
        // Lote de bens declarados é complementar; a candidatura em si já foi coletada.
      }

      return resultado;
    },
  };
}
