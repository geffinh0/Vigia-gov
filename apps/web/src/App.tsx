import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout.js";
import { Home } from "./pages/Home.js";
import { Busca } from "./pages/Busca.js";
import { Politico } from "./pages/Politico.js";
import { Fontes } from "./pages/Fontes.js";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="busca" element={<Busca />} />
        <Route path="politicos/:id" element={<Politico />} />
        <Route path="fontes" element={<Fontes />} />
      </Route>
    </Routes>
  );
}
