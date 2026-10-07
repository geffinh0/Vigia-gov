import { useEffect, useState } from "react";
import { api, type FonteDados } from "../api/client.js";

export function Fontes() {
  const [fontes, setFontes] = useState<FonteDados[] | null>(null);

  useEffect(() => {
    api.listarFontes().then((r) => setFontes(r.dados));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fontes de dados</h1>
        <p className="text-slate-400 text-sm mt-1">
          Todo dado exibido no Vigia-Gov vem de uma destas fontes oficiais. Nada é inventado ou
          estimado sem rótulo explícito.
        </p>
      </div>

      <div className="space-y-2">
        {fontes?.map((f) => (
          <a
            key={f.id}
            href={f.url}
            target="_blank"
            rel="noreferrer"
            className="block border border-slate-800 rounded-lg p-4 hover:bg-slate-900/60"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{f.nome}</p>
                <p className="text-sm text-slate-400">
                  {f.orgaoResponsavel} · {f.esfera}
                  {f.uf ? ` · ${f.uf}` : ""}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  f.ativa ? "bg-emerald-900 text-emerald-300" : "bg-slate-800 text-slate-400"
                }`}
              >
                {f.ativa ? "ativa" : "inativa"}
              </span>
            </div>
            {f.ultimaSincronizacao && (
              <p className="text-xs text-slate-600 mt-2">
                Última sincronização: {new Date(f.ultimaSincronizacao).toLocaleString("pt-BR")}
              </p>
            )}
          </a>
        ))}
        {fontes && fontes.length === 0 && (
          <p className="text-slate-500">
            Nenhuma fonte sincronizada ainda. Rode <code>pnpm sync</code> no backend para popular.
          </p>
        )}
      </div>
    </div>
  );
}
