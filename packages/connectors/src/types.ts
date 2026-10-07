import type { CargoEletivo, Esfera } from "@vigia-gov/db";

/**
 * Formato normalizado que todo conector deve produzir, independente da
 * fonte de origem. O serviço de ingestão (apps/api/src/jobs) é responsável
 * por fazer o upsert desses DTOs no banco, sempre amarrados a uma FonteDados.
 */

export interface PessoaDTO {
  /** Identificador estável na fonte de origem (ex: id do deputado na API da Câmara). */
  idExterno: string;
  nome: string;
  nomeSocial?: string;
  cpfMascarado?: string;
  dataNascimento?: string; // ISO 8601
}

export interface MandatoDTO {
  pessoa: PessoaDTO;
  orgao: {
    nome: string;
    sigla?: string;
    esfera: Esfera;
    uf?: string;
    municipio?: string;
  };
  cargo: CargoEletivo;
  uf: string;
  municipio?: string;
  partido?: string;
  legislaturaInicio: number;
  legislaturaFim: number;
  dataInicio: string;
  dataFim?: string;
  idExterno?: string;
}

export interface RemuneracaoDTO {
  pessoaIdExterno: string;
  orgaoNome: string;
  competenciaAno: number;
  competenciaMes: number;
  tipo:
    | "SUBSIDIO"
    | "SALARIO_BASE"
    | "VERBA_INDENIZATORIA"
    | "COTA_PARLAMENTAR"
    | "AUXILIO"
    | "DIARIA"
    | "DECIMO_TERCEIRO"
    | "FERIAS"
    | "OUTRO";
  valor: number;
}

export interface CandidaturaDTO {
  pessoa: PessoaDTO;
  anoEleicao: number;
  abrangencia: Esfera;
  turno: number;
  cargoPretendido: CargoEletivo;
  uf: string;
  municipio?: string;
  partido: string;
  coligacao?: string;
  numeroUrna?: string;
  situacaoCandidatura: "DEFERIDA" | "INDEFERIDA" | "CASSADA" | "RENUNCIA" | "EM_JULGAMENTO";
  situacaoFinal?: "ELEITO" | "ELEITO_MEDIA" | "NAO_ELEITO" | "SUPLENTE" | "EM_ANDAMENTO";
  votosRecebidos?: number;
  bensDeclaradosTotal?: number;
  idExternoTse?: string;
  bensDeclarados?: { descricao: string; valor: number }[];
}

export interface FonteDadosDescriptor {
  nome: string;
  orgaoResponsavel: string;
  esfera: Esfera;
  uf?: string;
  url: string;
  tipoAcesso: "API_OFICIAL" | "DOWNLOAD_CSV_OFICIAL" | "PORTAL_MANUAL" | "SCRAPING" | "FOIA_LAI";
}

export interface SyncResult {
  pessoas: PessoaDTO[];
  mandatos: MandatoDTO[];
  remuneracoes: RemuneracaoDTO[];
  candidaturas: CandidaturaDTO[];
}

export function emptySyncResult(): SyncResult {
  return { pessoas: [], mandatos: [], remuneracoes: [], candidaturas: [] };
}

/**
 * Contrato que toda fonte de dados (federal, estadual ou municipal) deve
 * implementar para entrar no sistema de sincronização automática.
 *
 * Para adicionar um novo estado: implemente esta interface em um novo
 * arquivo (ex: `src/estaduais/al-assembleia.ts`), registre-o em
 * `src/registry.ts` e descreva a fonte em `fonte()`. Veja README.md deste
 * pacote para o passo a passo e o status de cobertura por estado.
 */
export interface Connector {
  /** Identificador curto e estável, usado em logs e no agendador. */
  readonly id: string;
  /** Descrição legível (para painéis e documentação). */
  readonly nome: string;
  /** Metadados da fonte oficial de onde os dados são extraídos. */
  fonte(): FonteDadosDescriptor;
  /** Executa a coleta e retorna dados já normalizados. */
  sync(opts?: { anoEleicao?: number }): Promise<SyncResult>;
}
