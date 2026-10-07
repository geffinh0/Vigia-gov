import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type FonteDados } from "../api/client.js";

export function Home() {
  const [fontes, setFontes] = useState<FonteDados[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .listarFontes()
      .then((r) => setFontes(r.dados))
      .catch((e) => setErro(String(e)));
  }, []);

  const ativas = fontes?.filter((f) => f.ativa).length ?? 0;

  return (
    <div className="space-y-10">
      <section className="text-center space-y-4 py-10">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Transparência política, <span className="text-emerald-400">centralizada</span>
        </h1>
        <p className="max-w-2xl mx-auto text-slate-400">
          Cruza dados públicos oficiais de políticos de todos os estados brasileiros: mandatos,
          remuneração, cargos em gabinetes e possíveis vínculos de parentesco — tudo rastreável à
          fonte oficial de origem, atualizado automaticamente.
        </p>
        <Link
          to="/busca"
          className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition"
        >
          Buscar um político
        </Link>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard titulo="Fontes conectadas" valor={fontes ? String(fontes.length) : "…"} />
        <StatCard titulo="Fontes ativas hoje" valor={fontes ? String(ativas) : "…"} />
        <StatCard titulo="Cobertura" valor="Federal (todos os estados via mandato) + TSE" />
      </section>

      {erro && (
        <p className="text-sm text-amber-400">
          Não foi possível carregar as fontes agora ({erro}). Verifique se a API está no ar.
        </p>
      )}

      <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-3">
        <h2 className="font-semibold text-lg">Como funciona a atualização automática</h2>
        <p className="text-sm text-slate-400">
          Um agendador roda diariamente contra as APIs oficiais da Câmara dos Deputados e do
          Senado Federal. Em anos eleitorais, a partir de outubro, o sincronizador também baixa o
          lote de candidaturas e bens declarados do TSE — cobrindo automaticamente a disputa de
          todos os 27 estados. Veja o histórico de cada execução na página de Fontes de dados.
        </p>
      </section>
    </div>
  );
}

function StatCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
      <p className="text-slate-500 text-sm">{titulo}</p>
      <p className="text-2xl font-bold mt-1">{valor}</p>
    </div>
  );
}
