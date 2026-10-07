# Roadmap

## Feito (v0.1)

- Modelo de dados cobrindo políticos, mandatos, cargos comissionados,
  remuneração, parentesco, eleições/candidaturas e proveniência.
- Conectores federais reais: Câmara dos Deputados, Senado Federal, TSE
  (candidaturas + bens declarados, todos os 27 estados).
- API de busca/perfil, catálogo de fontes e curadoria de parentesco.
- Scheduler diário com modo eleitoral automático (ano par, a partir de
  outubro).
- Frontend de busca e perfil do político.
- Heurística (baixa confiança, sempre rotulada) de sugestão de parentesco
  entre titular de cargo comissionado e quem o nomeou.

## Próximos passos

1. **Conectores estaduais** — implementar, estado por estado, a coleta de
   remuneração e cargos de gabinete das Assembleias Legislativas e Governos
   Estaduais. Ver `packages/connectors/README.md` para o guia e a tabela de
   status. Prioridade sugerida: estados com portal de dados abertos já
   publicado (verificar caso a caso — não assumir).
2. **Portal da Transparência (Executivo Federal)** — conector para
   remuneração de servidores do Executivo Federal, incluindo os nomeados em
   cargos de confiança (fonte com API oficial, requer chave de API).
3. **CargoComissionado em escala** — hoje o schema e o motor de nepotismo já
   suportam esse modelo; falta volume de dados reais (depende dos conectores
   estaduais/federal acima) para a heurística ter o que varrer.
4. **Autenticação e papéis de curadoria** — hoje `POST /parentescos/:id/
   curadoria` não tem controle de autoria; antes de abrir curadoria para
   colaboradores externos, adicionar login e histórico de quem confirmou o
   quê.
5. **Alertas de mudança** — notificar quando uma remuneração ou mandato muda
   de forma incomum (ex: salto súbito de remuneração, nomeação cruzada entre
   gabinetes de parentes).
6. **Testes automatizados** — hoje a cobertura é via validação manual
   (`pnpm typecheck`/`pnpm build`); adicionar testes de integração para a
   camada de ingestão (`apps/api/src/services/ingestao.ts`) é o próximo
   ganho de confiabilidade mais importante antes de abrir o projeto para
   mais contribuidores.
7. **Deploy contínuo** — hoje o projeto roda local/self-hosted; definir onde
   hospedar o Postgres + API (o scheduler precisa de um processo sempre
   ativo) e o frontend.
