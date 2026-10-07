import { useState } from "react";
import { Link } from "react-router-dom";
import { api, type Pessoa } from "../api/client.js";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR",
  "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const CARGOS = [
  "PRESIDENTE", "VICE_PRESIDENTE", "GOVERNADOR", "VICE_GOVERNADOR", "SENADOR", "DEPUTADO_FEDERAL",
  "DEPUTADO_ESTADUAL", "DEPUTADO_DISTRITAL", "PREFEITO", "VICE_PREFEITO", "VEREADOR",
];

export function Busca() {
  const [nome, setNome] = useState("");
  const [uf, setUf] = useState("");
  const [cargo, setCargo] = useState("");
  const [resultados, setResultados] = useState<Pessoa[] | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function buscar(e?: React.FormEvent) {
    e?.preventDefault();
    setCarregando(true);
    try {
      const resp = await api.buscarPoliticos({ nome, uf, cargo });
      setResultados(resp.dados);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Buscar políticos</h1>

      <form onSubmit={buscar} className="flex flex-wrap gap-3">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome"
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 flex-1 min-w-[200px]"
        />
        <select
          value={uf}
          onChange={(e) => setUf(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
        >
          <option value="">Todas as UFs</option>
          {UFS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <select
          value={cargo}
          onChange={(e) => setCargo(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2"
        >
          <option value="">Todos os cargos</option>
          {CARGOS.map((c) => (
            <option key={c} value={c}>
              {c.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2 rounded-lg"
        >
          Buscar
        </button>
      </form>

      {carregando && <p className="text-slate-400">Buscando…</p>}

      {resultados && (
        <ul className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
          {resultados.length === 0 && (
            <li className="p-4 text-slate-400">Nenhum resultado. Tente outro filtro.</li>
          )}
          {resultados.map((p) => (
            <li key={p.id} className="p-4 hover:bg-slate-900/60">
              <Link to={`/politicos/${p.id}`} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.nome}</p>
                  {p.mandatos[0] && (
                    <p className="text-sm text-slate-400">
                      {p.mandatos[0].cargo.replaceAll("_", " ")} · {p.mandatos[0].uf} ·{" "}
                      {p.mandatos[0].partido ?? "sem partido"}
                    </p>
                  )}
                </div>
                <span className="text-emerald-400 text-sm">Ver perfil →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
