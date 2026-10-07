const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`Falha ao buscar ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface Orgao {
  id: string;
  nome: string;
  sigla?: string | null;
  esfera: string;
  uf?: string | null;
  municipio?: string | null;
}

export interface Mandato {
  id: string;
  cargo: string;
  uf: string;
  municipio?: string | null;
  partido?: string | null;
  legislaturaInicio: number;
  legislaturaFim: number;
  dataInicio: string;
  dataFim?: string | null;
  situacao: string;
  orgao: Orgao;
}

export interface Remuneracao {
  id: string;
  competenciaAno: number;
  competenciaMes: number;
  tipo: string;
  valor: string;
  orgao: Orgao;
}

export interface Pessoa {
  id: string;
  nome: string;
  nomeSocial?: string | null;
  cpfMascarado?: string | null;
  ehPolitico: boolean;
  mandatos: Mandato[];
  remuneracoes?: Remuneracao[];
  parentescos?: {
    pessoa: { id: string; nome: string };
    grau: string;
    origem: string;
    confianca: string;
    fonte: { nome: string; url: string };
  }[];
}

export interface FonteDados {
  id: string;
  nome: string;
  orgaoResponsavel: string;
  esfera: string;
  uf?: string | null;
  url: string;
  tipoAcesso: string;
  confiavel: boolean;
  ativa: boolean;
  ultimaSincronizacao?: string | null;
}

export const api = {
  buscarPoliticos: (params: { nome?: string; uf?: string; cargo?: string; partido?: string; pagina?: number }) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) qs.set(k, String(v));
    }
    return get<{ dados: Pessoa[]; total: number; totalPaginas: number; pagina: number }>(
      `/politicos?${qs.toString()}`,
    );
  },
  obterPolitico: (id: string) => get<Pessoa>(`/politicos/${id}`),
  listarFontes: () => get<{ dados: FonteDados[] }>("/fontes"),
  listarParentescos: () => get<{ dados: unknown[] }>("/parentescos"),
};
