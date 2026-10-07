import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Carrega o .env da raiz do monorepo, independente do cwd de onde o
// processo foi iniciado (útil ao rodar `pnpm dev:api` a partir da raiz).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const schema = z.object({
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  ADMIN_API_KEY: z.string().min(1, "ADMIN_API_KEY é obrigatório para proteger rotas de sync"),
  SYNC_CRON_FEDERAL: z.string().default("0 4 * * *"), // diário às 04:00
  ANO_ELEICAO_ATUAL: z.coerce.number().optional(),
});

export const env = schema.parse(process.env);
