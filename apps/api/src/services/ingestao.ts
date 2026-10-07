import type {
  CandidaturaDTO,
  Connector,
  FonteDadosDescriptor,
  MandatoDTO,
  PessoaDTO,
  RemuneracaoDTO,
  SyncResult,
} from "@vigia-gov/connectors";
import { prisma, type FonteDados, type Orgao, type Pessoa } from "@vigia-gov/db";

/**
 * Camada de ingestão: recebe o SyncResult normalizado de um Connector e faz
 * o upsert no banco, sempre amarrado à FonteDados do conector de origem e
 * registrando o resultado em SincronizacaoLog. É a única parte do sistema
 * com permissão de escrita nas tabelas de domínio a partir de dados
 * externos — rotas da API nunca escrevem dados vindos de conectores
 * diretamente.
 */

async function obterOuCriarFonte(descriptor: FonteDadosDescriptor): Promise<FonteDados> {
  return prisma.fonteDados.upsert({
    where: { nome: descriptor.nome },
    update: {
      url: descriptor.url,
      tipoAcesso: descriptor.tipoAcesso,
      ultimaSincronizacao: new Date(),
    },
    create: {
      nome: descriptor.nome,
      orgaoResponsavel: descriptor.orgaoResponsavel,
      esfera: descriptor.esfera,
      uf: descriptor.uf,
      url: descriptor.url,
      tipoAcesso: descriptor.tipoAcesso,
      ultimaSincronizacao: new Date(),
    },
  });
}

async function obterOuCriarOrgao(input: {
  nome: string;
  sigla?: string;
  esfera: Orgao["esfera"];
  uf?: string;
  municipio?: string;
}): Promise<Orgao> {
  const existente = await prisma.orgao.findFirst({
    where: { nome: input.nome, uf: input.uf ?? null, municipio: input.municipio ?? null },
  });
  if (existente) return existente;

  return prisma.orgao.create({
    data: {
      nome: input.nome,
      sigla: input.sigla,
      esfera: input.esfera,
      // Câmaras e assembleias são Legislativo; demais entram como Executivo
      // por padrão — ajuste manualmente se um conector precisar de outro poder.
      poder: /câmara|assembleia|senado|congresso/i.test(input.nome) ? "LEGISLATIVO" : "EXECUTIVO",
      uf: input.uf,
      municipio: input.municipio,
    },
  });
}

async function obterOuCriarPessoa(dto: PessoaDTO): Promise<Pessoa> {
  const existente = await prisma.pessoa.findFirst({
    where: { idsExternos: { has: dto.idExterno } },
  });
  if (existente) {
    return prisma.pessoa.update({
      where: { id: existente.id },
      data: {
        nome: dto.nome,
        nomeSocial: dto.nomeSocial ?? existente.nomeSocial,
        cpfMascarado: dto.cpfMascarado ?? existente.cpfMascarado,
        dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : existente.dataNascimento,
        ehPolitico: true,
      },
    });
  }

  return prisma.pessoa.create({
    data: {
      nome: dto.nome,
      nomeSocial: dto.nomeSocial,
      cpfMascarado: dto.cpfMascarado,
      dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
      ehPolitico: true,
      idsExternos: [dto.idExterno],
    },
  });
}

async function ingerirMandato(dto: MandatoDTO, fonteId: string) {
  const pessoa = await obterOuCriarPessoa(dto.pessoa);
  const orgao = await obterOuCriarOrgao(dto.orgao);

  const existente = dto.idExterno
    ? await prisma.mandato.findFirst({ where: { idExterno: dto.idExterno } })
    : await prisma.mandato.findFirst({
        where: {
          pessoaId: pessoa.id,
          orgaoId: orgao.id,
          cargo: dto.cargo,
          legislaturaInicio: dto.legislaturaInicio,
        },
      });

  const data = {
    pessoaId: pessoa.id,
    orgaoId: orgao.id,
    cargo: dto.cargo,
    uf: dto.uf,
    municipio: dto.municipio,
    partido: dto.partido,
    legislaturaInicio: dto.legislaturaInicio,
    legislaturaFim: dto.legislaturaFim,
    dataInicio: new Date(dto.dataInicio),
    dataFim: dto.dataFim ? new Date(dto.dataFim) : null,
    idExterno: dto.idExterno,
    fonteId,
  };

  if (existente) {
    await prisma.mandato.update({ where: { id: existente.id }, data });
  } else {
    await prisma.mandato.create({ data });
  }
}

async function ingerirRemuneracao(dto: RemuneracaoDTO, fonteId: string) {
  const pessoa = await prisma.pessoa.findFirst({
    where: { idsExternos: { has: dto.pessoaIdExterno } },
  });
  if (!pessoa) return; // remuneração sem mandato/pessoa associada ainda — ignora nesta rodada

  const orgao = await obterOuCriarOrgao({ nome: dto.orgaoNome, esfera: "FEDERAL" });

  await prisma.remuneracao.upsert({
    where: {
      pessoaId_orgaoId_competenciaAno_competenciaMes_tipo: {
        pessoaId: pessoa.id,
        orgaoId: orgao.id,
        competenciaAno: dto.competenciaAno,
        competenciaMes: dto.competenciaMes,
        tipo: dto.tipo,
      },
    },
    update: { valor: dto.valor, fonteId },
    create: {
      pessoaId: pessoa.id,
      orgaoId: orgao.id,
      competenciaAno: dto.competenciaAno,
      competenciaMes: dto.competenciaMes,
      tipo: dto.tipo,
      valor: dto.valor,
      fonteId,
    },
  });
}

async function ingerirCandidatura(dto: CandidaturaDTO, fonteId: string) {
  const pessoa = await obterOuCriarPessoa(dto.pessoa);

  const eleicao = await prisma.eleicao.upsert({
    where: {
      ano_abrangencia_turno: { ano: dto.anoEleicao, abrangencia: dto.abrangencia, turno: dto.turno },
    },
    update: {},
    create: { ano: dto.anoEleicao, abrangencia: dto.abrangencia, turno: dto.turno },
  });

  const existente = dto.idExternoTse
    ? await prisma.candidatura.findFirst({ where: { idExternoTse: dto.idExternoTse } })
    : null;

  const data = {
    pessoaId: pessoa.id,
    eleicaoId: eleicao.id,
    cargoPretendido: dto.cargoPretendido,
    uf: dto.uf,
    municipio: dto.municipio,
    partido: dto.partido,
    coligacao: dto.coligacao,
    numeroUrna: dto.numeroUrna,
    situacaoCandidatura: dto.situacaoCandidatura,
    situacaoFinal: dto.situacaoFinal,
    votosRecebidos: dto.votosRecebidos,
    bensDeclaradosTotal: dto.bensDeclaradosTotal,
    idExternoTse: dto.idExternoTse,
    fonteId,
  };

  const candidatura = existente
    ? await prisma.candidatura.update({ where: { id: existente.id }, data })
    : await prisma.candidatura.create({ data });

  if (dto.bensDeclarados?.length) {
    await prisma.bemDeclarado.deleteMany({ where: { candidaturaId: candidatura.id } });
    await prisma.bemDeclarado.createMany({
      data: dto.bensDeclarados.map((bem) => ({
        candidaturaId: candidatura.id,
        descricao: bem.descricao,
        valor: bem.valor,
      })),
    });
  }
}

export async function sincronizarConector(connector: Connector, opts?: { anoEleicao?: number }) {
  const descriptor = connector.fonte();
  const fonte = await obterOuCriarFonte(descriptor);

  const log = await prisma.sincronizacaoLog.create({
    data: { fonteId: fonte.id, conector: connector.id, status: "EM_ANDAMENTO" },
  });

  try {
    const resultado: SyncResult = await connector.sync(opts);

    for (const mandato of resultado.mandatos) {
      await ingerirMandato(mandato, fonte.id);
    }
    for (const remuneracao of resultado.remuneracoes) {
      await ingerirRemuneracao(remuneracao, fonte.id);
    }
    for (const candidatura of resultado.candidaturas) {
      await ingerirCandidatura(candidatura, fonte.id);
    }

    const registros =
      resultado.pessoas.length +
      resultado.mandatos.length +
      resultado.remuneracoes.length +
      resultado.candidaturas.length;

    await prisma.sincronizacaoLog.update({
      where: { id: log.id },
      data: { status: "SUCESSO", finalizadoEm: new Date(), registrosProcessados: registros },
    });
    await prisma.fonteDados.update({
      where: { id: fonte.id },
      data: { ultimaSincronizacao: new Date() },
    });

    return { ok: true as const, registros };
  } catch (err) {
    await prisma.sincronizacaoLog.update({
      where: { id: log.id },
      data: {
        status: "ERRO",
        finalizadoEm: new Date(),
        erro: err instanceof Error ? err.message : String(err),
      },
    });
    return { ok: false as const, erro: err instanceof Error ? err.message : String(err) };
  }
}
