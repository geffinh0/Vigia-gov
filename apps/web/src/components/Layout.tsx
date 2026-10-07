import { NavLink, Outlet } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    isActive ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"
  }`;

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏛️</span>
            <span className="font-bold text-lg tracking-tight">Vigia-Gov</span>
          </div>
          <nav className="flex gap-1">
            <NavLink to="/" end className={linkClass}>
              Início
            </NavLink>
            <NavLink to="/busca" className={linkClass}>
              Buscar políticos
            </NavLink>
            <NavLink to="/fontes" className={linkClass}>
              Fontes de dados
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-800 text-center text-xs text-slate-500 py-4">
        Todo dado exibido aqui tem origem rastreável em uma fonte pública oficial — veja a página
        "Fontes de dados".
      </footer>
    </div>
  );
}
