import { env } from "./env.js";
import { criarApp } from "./app.js";
import { iniciarAgendador } from "./jobs/scheduler.js";

const app = criarApp();

app.listen(env.PORT, () => {
  console.log(`[api] Vigia-Gov escutando em http://localhost:${env.PORT}`);
  iniciarAgendador();
});
