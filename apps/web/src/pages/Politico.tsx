import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, type Pessoa } from "../api/client.js";

function formatarValor(valor: string | number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(valor));
}

const CONFIANCA_LABEL: Record<string, string> = {
  ALTA: "confirmado",
  MEDIA: "provável",
  BAIXA: "sugestão automática — não confirmado",
};

export function Politico() {
  const { id } = useParams<{ id: string }>();
  const [pessoa, setPessoa] = useState<Pessoa | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .obterPolitico(id)
      .then(setPessoa)
      .catch((e) => setErro(String(e)));
  }, [id]);

  if (erro) return <p className="text-amber-400">Não foi possível carregar este perfil ({erro}).</p>;
  if (!pessoa) return <p className="text-slate-400">Carregando…</p>;

  const totalRemuneracaoRecente = (pessoa.remuneracoes ?? [])
    .slice(0, 12)
    .reduce((soma, r) => soma + Number(r.valor), 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">{pessoa.nome}</h1>
        {pessoa.cpfMascarado && <p className="text-slate-500 text-sm">CPF {pessoa.cpfMascarado}</p>}
      </header>

      <section>
        <h2 className="font-semibold text-lg mb-3">Mandatos</h2>
        <div className="space-y-2">
          {pessoa.mandatos.map((m) => (
            <div key={m.id} className="border border-slate-800 rounded-lg p-4 flex justify-between">
              <div>
                <p className="font-medium">{m.cargo.replaceAll("_", " ")}</p>
                <p className="text-sm text-slate-400">
                  {m.orgao.nome} · {m.uf} · {m.partido ?? "sem partido"}
                </p>
              </div>
              <div className="text-right text-sm text-slate-400">
                <p>
                  {new Date(m.dataInicio).getFullYear()}
                  {m.dataFim ? `–${new Date(m.dataFim).getFullYear()}` : " – atual"}
                </p>
                <p>{m.situacao.replaceAll("_", " ")}</p>
              </div>
            </div>
          ))}
          {pessoa.mandatos.length === 0 && <p className="text-slate-500">Nenhum mandato registrado.</p>}
        </div>
      </section>

      {pessoa.remuneracoes && pessoa.remuneracoes.length > 0 && (
        <section>
          <h2 className="font-semibold text-lg mb-3">Remuneração (últimos registros)</h2>
          <p className="text-sm text-slate-400 mb-2">
            Soma dos últimos {Math.min(12, pessoa.remuneracoes.length)} lançamentos:{" "}
            <span className="text-slate-200 font-medium">{formatarValor(totalRemuneracaoRecente)}</span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="py-1 pr-4">Competência</th>
                  <th className="py-1 pr-4">Tipo</th>
                  <th className="py-1 pr-4">Órgão</th>
                  <th className="py-1 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {pessoa.remuneracoes.slice(0, 24).map((r) => (
                  <tr key={r.id} className="border-t border-slate-800">
                    <td className="py-1 pr-4">
                      {r.competenciaMes.toString().padStart(2, "0")}/{r.competenciaAno}
                    </td>
                    <td className="py-1 pr-4">{r.tipo.replaceAll("_", " ")}</td>
                    <td className="py-1 pr-4">{r.orgao.nome}</td>
                    <td className="py-1 text-right">{formatarValor(r.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold text-lg mb-3">Possíveis vínculos de parentesco</h2>
        {!pessoa.parentescos || pessoa.parentescos.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhum vínculo registrado até o momento.</p>
        ) : (
          <div className="space-y-2">
            {pessoa.parentescos.map((p, i) => (
              <div key={i} className="border border-slate-800 rounded-lg p-4">
                <p className="font-medium">{p.pessoa.nome}</p>
                <p className="text-sm text-slate-400">
                  {p.grau.replaceAll("_", " ")} ·{" "}
                  <span
                    className={
                      p.confianca === "BAIXA" ? "text-amber-400" : "text-emerald-400"
                    }
                  >
                    {CONFIANCA_LABEL[p.confianca] ?? p.confianca}
                  </span>
                </p>
                <p className="text-xs text-slate-600 mt-1">Fonte: {p.fonte.nome}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
