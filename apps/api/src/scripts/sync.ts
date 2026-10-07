import { executarSincronizacaoDiaria } from "../jobs/scheduler.js";

/**
 * Executa a sincronização completa uma única vez, via linha de comando:
 *   pnpm sync
 * Útil para popular o banco localmente ou rodar como job avulso (ex: um
 * cron do sistema operacional, ou um step de CI) sem precisar manter o
 * processo da API no ar.
 */
executarSincronizacaoDiaria()
  .then((resultados) => {
    console.table(resultados);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Falha na sincronização:", err);
    process.exit(1);
  });
