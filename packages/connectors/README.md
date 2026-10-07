# @vigia-gov/connectors

Conectores de ingestão de dados públicos. Cada conector implementa a
interface `Connector` (`src/types.ts`) e devolve dados já normalizados
(`SyncResult`), que o backend então grava no banco sempre amarrados a um
registro em `FonteDados` — nada entra no sistema sem procedência rastreável.

## Implementados (nível federal, cobre todos os estados)

| Conector | Fonte oficial | O que traz |
|---|---|---|
| `camaraDeputadosConnector` | API Dados Abertos da Câmara dos Deputados | Deputados federais em exercício, mandato, partido/UF, cota parlamentar (CEAP) por mês |
| `senadoFederalConnector` | Dados Abertos do Senado Federal | Senadores em exercício, mandato, partido/UF |
| `criarConectorTse(ano)` | Repositório de Dados Eleitorais do TSE | Candidaturas, resultado da eleição e bens declarados — todas as UFs, em uma única fonte nacional |

Esses três conectores já cobrem o nível federal para todo o país. O que
falta para "todos os estados" na visão do produto é o nível **estadual e
municipal**: remuneração de servidores e cargos de gabinete em cada
Assembleia Legislativa, Governo Estadual, Câmara Municipal e Prefeitura —
dados que o TSE não possui e que cada ente publica (ou não) de um jeito
diferente.

## Por que os 27 estados não vêm prontos

Não existe uma API nacional única para "servidores comissionados e
remuneração" estadual/municipal — cada um dos 27 entes (26 estados + DF)
mantém seu próprio portal da transparência, com formatos, disponibilidade
de API e qualidade de dados muito diferentes entre si (alguns expõem JSON/
CSV abertos, outros só HTML para consulta manual, outros exigem raspagem).
Implementar um conector real para cada um exige verificar a fonte viva
(endpoint, esquema, paginação) — algo que não dá para fazer com confiança
sem acesso de rede ao host de cada portal, e que é fácil de deixar
quebrado se for "chutado". Por isso o projeto entra com a arquitetura
pronta e os três conectores federais funcionando de ponta a ponta, e trata
cada estado como uma unidade de trabalho independente, descrita abaixo.

## Status por estado

Preencha a coluna "Portal" e "Status" ao implementar cada um (PR
bem-vindo). Deixe em branco o que ainda não foi verificado — não adivinhe
URLs.

| UF | Assembleia/Órgão | Portal de transparência | Status |
|----|---|---|---|
| AC | Assembleia Legislativa do Acre | _a pesquisar_ | todo |
| AL | Assembleia Legislativa de Alagoas | _a pesquisar_ | todo |
| AP | Assembleia Legislativa do Amapá | _a pesquisar_ | todo |
| AM | Assembleia Legislativa do Amazonas | _a pesquisar_ | todo |
| BA | Assembleia Legislativa da Bahia | _a pesquisar_ | todo |
| CE | Assembleia Legislativa do Ceará | _a pesquisar_ | todo |
| DF | Câmara Legislativa do DF | _a pesquisar_ | todo |
| ES | Assembleia Legislativa do Espírito Santo | _a pesquisar_ | todo |
| GO | Assembleia Legislativa de Goiás | _a pesquisar_ | todo |
| MA | Assembleia Legislativa do Maranhão | _a pesquisar_ | todo |
| MT | Assembleia Legislativa de Mato Grosso | _a pesquisar_ | todo |
| MS | Assembleia Legislativa de Mato Grosso do Sul | _a pesquisar_ | todo |
| MG | Assembleia Legislativa de Minas Gerais | _a pesquisar_ | todo |
| PA | Assembleia Legislativa do Pará | _a pesquisar_ | todo |
| PB | Assembleia Legislativa da Paraíba | _a pesquisar_ | todo |
| PR | Assembleia Legislativa do Paraná | _a pesquisar_ | todo |
| PE | Assembleia Legislativa de Pernambuco | _a pesquisar_ | todo |
| PI | Assembleia Legislativa do Piauí | _a pesquisar_ | todo |
| RJ | Assembleia Legislativa do Rio de Janeiro | _a pesquisar_ | todo |
| RN | Assembleia Legislativa do Rio Grande do Norte | _a pesquisar_ | todo |
| RS | Assembleia Legislativa do Rio Grande do Sul | _a pesquisar_ | todo |
| RO | Assembleia Legislativa de Rondônia | _a pesquisar_ | todo |
| RR | Assembleia Legislativa de Roraima | _a pesquisar_ | todo |
| SC | Assembleia Legislativa de Santa Catarina | _a pesquisar_ | todo |
| SP | Assembleia Legislativa de São Paulo | _a pesquisar_ | todo |
| SE | Assembleia Legislativa de Sergipe | _a pesquisar_ | todo |
| TO | Assembleia Legislativa do Tocantins | _a pesquisar_ | todo |

## Como adicionar o conector de um estado

1. Crie `src/estaduais/<uf>-assembleia.ts` (ou `-governo.ts`,
   `-prefeitura-capital.ts`, conforme o órgão).
2. Implemente a interface `Connector`:
   - `fonte()`: descreva a URL oficial, se é API, CSV ou portal manual.
   - `sync()`: colete e devolva `PessoaDTO`/`MandatoDTO`/`RemuneracaoDTO`.
     Para cargos de gabinete/comissionados (o alvo típico de apuração de
     nepotismo), ainda não há um DTO genérico de `CargoComissionado` neste
     pacote — adicione `CargoComissionadoDTO` em `types.ts` seguindo o
     mesmo padrão e faça o upsert em `apps/api/src/jobs` (veja como
     `MandatoDTO` é consumido lá).
3. Registre o conector em `conectoresEstaduais` (`src/registry.ts`).
4. Atualize a tabela acima com o status real.
5. Se o portal só oferece HTML (sem API/CSV), implemente como
   `tipoAcesso: "SCRAPING"` e documente a fragilidade (seletor pode quebrar
   a qualquer redesign do site) — prefira sempre API/CSV oficial quando
   existir.

## Detecção de parentesco (nepotismo)

Os conectores não inferem parentesco — eles só trazem o dado declarado
quando a fonte o expõe explicitamente (raro). A ligação entre um
político e pessoas nomeadas por ele para cargos de confiança é feita pelo
serviço `apps/api/src/services/nepotismo.ts`, com heurísticas explícitas
(mesmo sobrenome raro + mesmo domicílio eleitoral, por exemplo) que
**sempre** geram registros com `confianca: "BAIXA"` e exigem curadoria
humana antes de serem tratados como fato confirmado na interface. Nunca
apresente uma heurística automática como acusação definitiva.
