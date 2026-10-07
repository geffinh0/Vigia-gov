-- CreateEnum
CREATE TYPE "Esfera" AS ENUM ('FEDERAL', 'ESTADUAL', 'MUNICIPAL');

-- CreateEnum
CREATE TYPE "Poder" AS ENUM ('EXECUTIVO', 'LEGISLATIVO', 'JUDICIARIO');

-- CreateEnum
CREATE TYPE "CargoEletivo" AS ENUM ('PRESIDENTE', 'VICE_PRESIDENTE', 'GOVERNADOR', 'VICE_GOVERNADOR', 'SENADOR', 'DEPUTADO_FEDERAL', 'DEPUTADO_ESTADUAL', 'DEPUTADO_DISTRITAL', 'PREFEITO', 'VICE_PREFEITO', 'VEREADOR');

-- CreateEnum
CREATE TYPE "SituacaoMandato" AS ENUM ('EM_EXERCICIO', 'AFASTADO', 'LICENCIADO', 'FINALIZADO', 'CASSADO', 'RENUNCIOU', 'FALECEU');

-- CreateEnum
CREATE TYPE "TipoVinculo" AS ENUM ('COMISSIONADO', 'EFETIVO', 'TERCEIRIZADO', 'ESTAGIARIO', 'TEMPORARIO', 'NATUREZA_ESPECIAL');

-- CreateEnum
CREATE TYPE "TipoRemuneracao" AS ENUM ('SUBSIDIO', 'SALARIO_BASE', 'VERBA_INDENIZATORIA', 'COTA_PARLAMENTAR', 'AUXILIO', 'DIARIA', 'DECIMO_TERCEIRO', 'FERIAS', 'OUTRO');

-- CreateEnum
CREATE TYPE "GrauParentesco" AS ENUM ('CONJUGE', 'COMPANHEIRO', 'FILHO_FILHA', 'PAI_MAE', 'IRMAO_IRMA', 'AVO_AVO', 'NETO_NETA', 'SOBRINHO_SOBRINHA', 'TIO_TIA', 'SOGRO_SOGRA', 'GENRO_NORA', 'CUNHADO_CUNHADA', 'PRIMO_PRIMA', 'OUTRO');

-- CreateEnum
CREATE TYPE "OrigemParentesco" AS ENUM ('DECLARACAO_OFICIAL', 'INVESTIGACAO_JORNALISTICA', 'DECISAO_JUDICIAL', 'CURADORIA_MANUAL', 'INFERENCIA_AUTOMATICA');

-- CreateEnum
CREATE TYPE "ConfiancaParentesco" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "TipoAcessoFonte" AS ENUM ('API_OFICIAL', 'DOWNLOAD_CSV_OFICIAL', 'PORTAL_MANUAL', 'SCRAPING', 'FOIA_LAI');

-- CreateEnum
CREATE TYPE "StatusSincronizacao" AS ENUM ('SUCESSO', 'ERRO', 'EM_ANDAMENTO', 'PARCIAL');

-- CreateEnum
CREATE TYPE "SituacaoCandidatura" AS ENUM ('DEFERIDA', 'INDEFERIDA', 'CASSADA', 'RENUNCIA', 'EM_JULGAMENTO');

-- CreateEnum
CREATE TYPE "SituacaoFinalCandidatura" AS ENUM ('ELEITO', 'ELEITO_MEDIA', 'NAO_ELEITO', 'SUPLENTE', 'EM_ANDAMENTO');

-- CreateTable
CREATE TABLE "Pessoa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeSocial" TEXT,
    "cpfMascarado" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "ehPolitico" BOOLEAN NOT NULL DEFAULT false,
    "idsExternos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pessoa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orgao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT,
    "esfera" "Esfera" NOT NULL,
    "poder" "Poder" NOT NULL,
    "uf" TEXT,
    "municipio" TEXT,
    "siteTransparencia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Orgao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mandato" (
    "id" TEXT NOT NULL,
    "pessoaId" TEXT NOT NULL,
    "orgaoId" TEXT NOT NULL,
    "cargo" "CargoEletivo" NOT NULL,
    "uf" TEXT NOT NULL,
    "municipio" TEXT,
    "partido" TEXT,
    "legislaturaInicio" INTEGER NOT NULL,
    "legislaturaFim" INTEGER NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "situacao" "SituacaoMandato" NOT NULL DEFAULT 'EM_EXERCICIO',
    "idExterno" TEXT,
    "fonteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mandato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargoComissionado" (
    "id" TEXT NOT NULL,
    "titularId" TEXT NOT NULL,
    "orgaoId" TEXT NOT NULL,
    "nomeadoPorId" TEXT,
    "cargo" TEXT NOT NULL,
    "tipoVinculo" "TipoVinculo" NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "remuneracaoMensal" DECIMAL(14,2),
    "fonteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CargoComissionado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Remuneracao" (
    "id" TEXT NOT NULL,
    "pessoaId" TEXT NOT NULL,
    "orgaoId" TEXT NOT NULL,
    "competenciaAno" INTEGER NOT NULL,
    "competenciaMes" INTEGER NOT NULL,
    "tipo" "TipoRemuneracao" NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "fonteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Remuneracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parentesco" (
    "id" TEXT NOT NULL,
    "pessoaAId" TEXT NOT NULL,
    "pessoaBId" TEXT NOT NULL,
    "grau" "GrauParentesco" NOT NULL,
    "origem" "OrigemParentesco" NOT NULL,
    "confianca" "ConfiancaParentesco" NOT NULL,
    "observacoes" TEXT,
    "fonteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parentesco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Eleicao" (
    "id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "abrangencia" "Esfera" NOT NULL,
    "turno" INTEGER NOT NULL DEFAULT 1,
    "dataPleito" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Eleicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidatura" (
    "id" TEXT NOT NULL,
    "pessoaId" TEXT NOT NULL,
    "eleicaoId" TEXT NOT NULL,
    "cargoPretendido" "CargoEletivo" NOT NULL,
    "uf" TEXT NOT NULL,
    "municipio" TEXT,
    "partido" TEXT NOT NULL,
    "coligacao" TEXT,
    "numeroUrna" TEXT,
    "situacaoCandidatura" "SituacaoCandidatura" NOT NULL,
    "situacaoFinal" "SituacaoFinalCandidatura",
    "votosRecebidos" INTEGER,
    "bensDeclaradosTotal" DECIMAL(16,2),
    "idExternoTse" TEXT,
    "fonteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BemDeclarado" (
    "id" TEXT NOT NULL,
    "candidaturaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(16,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BemDeclarado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FonteDados" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "orgaoResponsavel" TEXT NOT NULL,
    "esfera" "Esfera" NOT NULL,
    "uf" TEXT,
    "url" TEXT NOT NULL,
    "tipoAcesso" "TipoAcessoFonte" NOT NULL,
    "confiavel" BOOLEAN NOT NULL DEFAULT true,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "ultimaSincronizacao" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FonteDados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SincronizacaoLog" (
    "id" TEXT NOT NULL,
    "fonteId" TEXT NOT NULL,
    "conector" TEXT NOT NULL,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadoEm" TIMESTAMP(3),
    "status" "StatusSincronizacao" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "registrosProcessados" INTEGER,
    "erro" TEXT,

    CONSTRAINT "SincronizacaoLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pessoa_nome_idx" ON "Pessoa"("nome");

-- CreateIndex
CREATE INDEX "Orgao_esfera_uf_idx" ON "Orgao"("esfera", "uf");

-- CreateIndex
CREATE UNIQUE INDEX "Orgao_nome_uf_municipio_key" ON "Orgao"("nome", "uf", "municipio");

-- CreateIndex
CREATE INDEX "Mandato_pessoaId_idx" ON "Mandato"("pessoaId");

-- CreateIndex
CREATE INDEX "Mandato_orgaoId_cargo_uf_idx" ON "Mandato"("orgaoId", "cargo", "uf");

-- CreateIndex
CREATE INDEX "Mandato_idExterno_idx" ON "Mandato"("idExterno");

-- CreateIndex
CREATE INDEX "CargoComissionado_titularId_idx" ON "CargoComissionado"("titularId");

-- CreateIndex
CREATE INDEX "CargoComissionado_nomeadoPorId_idx" ON "CargoComissionado"("nomeadoPorId");

-- CreateIndex
CREATE INDEX "CargoComissionado_orgaoId_idx" ON "CargoComissionado"("orgaoId");

-- CreateIndex
CREATE INDEX "Remuneracao_competenciaAno_competenciaMes_idx" ON "Remuneracao"("competenciaAno", "competenciaMes");

-- CreateIndex
CREATE UNIQUE INDEX "Remuneracao_pessoaId_orgaoId_competenciaAno_competenciaMes__key" ON "Remuneracao"("pessoaId", "orgaoId", "competenciaAno", "competenciaMes", "tipo");

-- CreateIndex
CREATE INDEX "Parentesco_pessoaAId_idx" ON "Parentesco"("pessoaAId");

-- CreateIndex
CREATE INDEX "Parentesco_pessoaBId_idx" ON "Parentesco"("pessoaBId");

-- CreateIndex
CREATE UNIQUE INDEX "Parentesco_pessoaAId_pessoaBId_grau_key" ON "Parentesco"("pessoaAId", "pessoaBId", "grau");

-- CreateIndex
CREATE UNIQUE INDEX "Eleicao_ano_abrangencia_turno_key" ON "Eleicao"("ano", "abrangencia", "turno");

-- CreateIndex
CREATE INDEX "Candidatura_eleicaoId_uf_cargoPretendido_idx" ON "Candidatura"("eleicaoId", "uf", "cargoPretendido");

-- CreateIndex
CREATE INDEX "Candidatura_idExternoTse_idx" ON "Candidatura"("idExternoTse");

-- CreateIndex
CREATE INDEX "BemDeclarado_candidaturaId_idx" ON "BemDeclarado"("candidaturaId");

-- CreateIndex
CREATE UNIQUE INDEX "FonteDados_nome_key" ON "FonteDados"("nome");

-- CreateIndex
CREATE INDEX "SincronizacaoLog_fonteId_iniciadoEm_idx" ON "SincronizacaoLog"("fonteId", "iniciadoEm");

-- AddForeignKey
ALTER TABLE "Mandato" ADD CONSTRAINT "Mandato_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandato" ADD CONSTRAINT "Mandato_orgaoId_fkey" FOREIGN KEY ("orgaoId") REFERENCES "Orgao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandato" ADD CONSTRAINT "Mandato_fonteId_fkey" FOREIGN KEY ("fonteId") REFERENCES "FonteDados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoComissionado" ADD CONSTRAINT "CargoComissionado_titularId_fkey" FOREIGN KEY ("titularId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoComissionado" ADD CONSTRAINT "CargoComissionado_orgaoId_fkey" FOREIGN KEY ("orgaoId") REFERENCES "Orgao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoComissionado" ADD CONSTRAINT "CargoComissionado_nomeadoPorId_fkey" FOREIGN KEY ("nomeadoPorId") REFERENCES "Pessoa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargoComissionado" ADD CONSTRAINT "CargoComissionado_fonteId_fkey" FOREIGN KEY ("fonteId") REFERENCES "FonteDados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remuneracao" ADD CONSTRAINT "Remuneracao_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remuneracao" ADD CONSTRAINT "Remuneracao_orgaoId_fkey" FOREIGN KEY ("orgaoId") REFERENCES "Orgao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remuneracao" ADD CONSTRAINT "Remuneracao_fonteId_fkey" FOREIGN KEY ("fonteId") REFERENCES "FonteDados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parentesco" ADD CONSTRAINT "Parentesco_pessoaAId_fkey" FOREIGN KEY ("pessoaAId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parentesco" ADD CONSTRAINT "Parentesco_pessoaBId_fkey" FOREIGN KEY ("pessoaBId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parentesco" ADD CONSTRAINT "Parentesco_fonteId_fkey" FOREIGN KEY ("fonteId") REFERENCES "FonteDados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidatura" ADD CONSTRAINT "Candidatura_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "Pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidatura" ADD CONSTRAINT "Candidatura_eleicaoId_fkey" FOREIGN KEY ("eleicaoId") REFERENCES "Eleicao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidatura" ADD CONSTRAINT "Candidatura_fonteId_fkey" FOREIGN KEY ("fonteId") REFERENCES "FonteDados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BemDeclarado" ADD CONSTRAINT "BemDeclarado_candidaturaId_fkey" FOREIGN KEY ("candidaturaId") REFERENCES "Candidatura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SincronizacaoLog" ADD CONSTRAINT "SincronizacaoLog_fonteId_fkey" FOREIGN KEY ("fonteId") REFERENCES "FonteDados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
