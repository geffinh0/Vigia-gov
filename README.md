# Vigia-Gov

Plataforma de transparência que centraliza dados públicos de políticos
brasileiros — de todos os estados — em um único lugar: mandatos, remuneração,
cargos em gabinetes/funções públicas, possíveis vínculos de parentesco
(nepotismo) e histórico eleitoral. Cada informação exibida é rastreável a uma
fonte oficial, e o sistema se mantém atualizado sozinho através de
sincronizações automáticas, com atenção redobrada em anos de eleição.

## Por que isso existe

Hoje esses dados existem — mas espalhados: a Câmara tem sua API, o Senado a
dele, o TSE outra, e cada um dos 27 entes estaduais mantém seu próprio portal
de transparência, com formatos diferentes. Cruzar "quem nomeou quem", "quanto
cada um ganha" e "quem é parente de quem" exige hoje garimpar manualmente
dezenas de fontes. O Vigia-Gov automatiza essa coleta e cruzamento, mantendo a
procedência de cada dado sempre visível.

## Arquitetura

```
apps/
  api/          Backend (Express + Prisma). Rotas públicas de consulta,
                scheduler de sincronização automática e serviço de
                detecção heurística de parentesco.
  web/          Frontend (React + Vite + Tailwind). Busca, perfil do
                político e catálogo de fontes.
packages/
  db/           Schema Prisma (PostgreSQL) — o modelo de dados central.
  connectors/   Conectores de ingestão: um por fonte oficial de dados.
                Ver packages/connectors/README.md para a lista completa
                e o guia de como adicionar a fonte de um novo estado.
```

Fluxo de dados: `connector.sync()` baixa e normaliza dados de uma fonte →
`apps/api/src/services/ingestao.ts` faz o upsert no banco, sempre vinculado a
um registro em `FonteDados` → as rotas da API só leem o que já foi
ingerido/normalizado, nunca chamam fontes externas na hora da requisição.

## Modelo de dados (resumo)

- **Pessoa** — qualquer pessoa física rastreada (político, servidor nomeado,
  familiar citado em um vínculo).
- **Orgao** — instituição pública (câmara, assembleia, prefeitura, tribunal…)
  em qualquer esfera/estado.
- **Mandato** — mandato eletivo (cargo, partido, legislatura, situação).
- **CargoComissionado** — cargo de confiança/gabinete, com `titular` e
  `nomeadoPor` — o alvo típico de apuração de nepotismo.
- **Remuneracao** — série histórica mensal de valores recebidos.
- **Parentesco** — aresta do grafo de parentesco, sempre com `origem` e
  `confianca` explícitas (nunca apresentado como fato sem procedência).
- **Eleicao** / **Candidatura** / **BemDeclarado** — histórico eleitoral e
  patrimônio declarado.
- **FonteDados** / **SincronizacaoLog** — proveniência: toda tabela acima tem
  uma FK para a fonte de onde o dado veio, e cada execução de sincronização
  fica registrada.

Schema completo: `packages/db/prisma/schema.prisma`.

## Fontes de dados já implementadas

| Fonte | Cobertura | O que traz |
|---|---|---|
| API Dados Abertos — Câmara dos Deputados | Federal | Deputados em exercício, mandato, cota parlamentar mensal |
| Dados Abertos — Senado Federal | Federal | Senadores em exercício, mandato |
| Repositório de Dados Eleitorais — TSE | **Todos os 27 estados** | Candidaturas, resultado da eleição, bens declarados |

O nível **estadual/municipal** (remuneração de servidores e cargos de
gabinete em cada Assembleia/Prefeitura) ainda não tem uma API nacional única
— cada estado publica do seu jeito. A arquitetura de conectores já suporta
isso (interface `Connector` em `packages/connectors/src/types.ts`); o
`packages/connectors/README.md` traz a tabela de status por estado e o
passo a passo para implementar cada um à medida que as fontes forem
verificadas. Isso é tratado como trabalho contínuo, não como algo que dá para
"chutar" sem acesso à fonte viva de cada portal.

## Atualização automática

`apps/api/src/jobs/scheduler.ts` roda diariamente (`SYNC_CRON_FEDERAL`,
padrão 04:00) contra as fontes federais. Em anos eleitorais (pares), a partir
de outubro — período de divulgação de candidaturas e apuração — o
sincronizador também inclui o conector do TSE automaticamente, sem precisar
de configuração manual. Um disparo manual fica disponível em
`POST /admin/sync/federais` e `POST /admin/sync/eleicao/:ano` (protegidos por
`ADMIN_API_KEY`), e `pnpm sync` roda a rotina completa uma vez via linha de
comando.

## Como rodar localmente

Pré-requisitos: Node 20+, pnpm, Docker (para o Postgres local).

**Windows:** dê duplo clique em `start-local.bat` (ou rode pelo prompt) — ele
checa Node/pnpm, sobe o Postgres via Docker, instala dependências, aplica as
migrations e abre a API e o frontend em janelas separadas. Use
`stop-local.bat` para derrubar o Postgres depois.

**macOS/Linux:**

```bash
cp .env.example .env         # ajuste DATABASE_URL/ADMIN_API_KEY se necessário
docker compose up -d postgres
pnpm install
pnpm db:generate
pnpm --filter @vigia-gov/db migrate   # cria as tabelas
pnpm sync                             # popula com dados reais (Câmara/Senado/TSE)
pnpm dev:api                          # http://localhost:3333
pnpm dev:web                          # http://localhost:5173 (em outro terminal)
```

> Nota: os conectores foram escritos e documentados contra as especificações
> oficiais e estáveis dessas APIs, mas o ambiente onde este projeto foi
> inicialmente montado não tinha acesso de rede liberado para
> `dadosabertos.camara.leg.br`, `legis.senado.leg.br` e `cdn.tse.jus.br`
> (política de rede da sandbox). Rode `pnpm sync` em um ambiente com acesso
> normal à internet para a primeira validação ponta a ponta, e ajuste os
> conectores se algum campo de resposta tiver mudado.

## Privacidade e uso responsável

- Nenhum CPF completo é armazenado — apenas a versão mascarada, no mesmo
  padrão já usado pelos portais de transparência oficiais.
- Vínculos de parentesco inferidos automaticamente (por sobrenome) são
  gravados com `confianca: BAIXA` e rotulados na interface como "sugestão —
  não confirmado". Nunca são exibidos como acusação definitiva. Curadoria
  manual ou fonte oficial é necessária para elevar a confiança.
- Este projeto tem finalidade de transparência e fiscalização cidadã sobre
  agentes públicos no exercício da função — não sobre pessoas privadas.

## Roadmap

Veja [`ROADMAP.md`](./ROADMAP.md).
