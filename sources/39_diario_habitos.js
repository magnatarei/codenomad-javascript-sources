/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  39. Diário de hábitos com sequência
 * ------------------------------------------------------------
 * O que faz: Registra num arquivo JSON quais hábitos você cumpriu em cada
 *            dia. Calcula a sequência atual e a maior sequência de cada
 *            hábito e mostra um resumo em grade de texto, semana a semana.
 * Como usar: node 39_diario_habitos.js marcar "Ler 20 páginas"
 *            node 39_diario_habitos.js marcar Correr --data 2026-10-25
 *            node 39_diario_habitos.js desmarcar Correr --data 2026-10-25
 *            node 39_diario_habitos.js resumo --semanas 3 --arquivo meus-habitos.json
 *            node 39_diario_habitos.js --demo
 * O que você aprende: datas sem armadilha de fuso horário (new Date com
 *            ano, mês e dia), Set para marcar presença, cálculo de dias
 *            consecutivos, Array.from para gerar intervalos e montagem de
 *            uma grade de texto com padStart e padEnd.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const DIAS_DA_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// ---------- Datas ----------

function paraIso(data) {
  const dois = (n) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`;
}

function deIso(iso) {
  // new Date('2026-10-25') seria meia-noite em UTC e, no Brasil, viraria dia 24 às 21h.
  // Com new Date(ano, mês - 1, dia) a data nasce no fuso local, sem surpresa.
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  if (!partes) throw new Error(`Data inválida: "${iso}". Use o formato AAAA-MM-DD.`);
  const data = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  if (paraIso(data) !== iso) throw new Error(`Data inválida: ${iso} não existe no calendário.`);
  return data;
}

function somarDias(iso, dias) {
  const data = deIso(iso);
  data.setDate(data.getDate() + dias); // setDate aceita valores fora do mês e ajusta sozinho
  return paraIso(data);
}

// ---------- Persistência ----------

function carregar(arquivo) {
  if (!fs.existsSync(arquivo)) return { habitos: [], registros: {} };
  try {
    const diario = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    if (!Array.isArray(diario.habitos) || typeof diario.registros !== 'object') throw new Error('estrutura inesperada');
    return diario;
  } catch (erro) {
    throw new Error(`Não consegui ler ${arquivo}: ${erro.message}`);
  }
}

function salvar(arquivo, diario) {
  fs.writeFileSync(arquivo, JSON.stringify(diario, null, 2) + '\n', 'utf8');
}

// ---------- Sequências ----------

function diasDoHabito(diario, habito) {
  return new Set(Object.keys(diario.registros).filter((dia) => diario.registros[dia].includes(habito)));
}

function sequenciaAtual(dias, hoje) {
  // Conta para trás. Se hoje ainda não foi marcado, começa de ontem: a sequência
  // só quebra de verdade quando um dia termina sem registro.
  let dia = dias.has(hoje) ? hoje : somarDias(hoje, -1);
  let contagem = 0;
  while (dias.has(dia)) { contagem++; dia = somarDias(dia, -1); }
  return contagem;
}

function maiorSequencia(dias) {
  let maior = 0;
  let atual = 0;
  let anterior = null;
  for (const dia of [...dias].sort()) {
    atual = anterior !== null && somarDias(anterior, 1) === dia ? atual + 1 : 1;
    maior = Math.max(maior, atual);
    anterior = dia;
  }
  return maior;
}

// ---------- Operações ----------

function registrar(diario, habito, data, feito) {
  if (!habito) throw new Error('Informe o nome do hábito. Exemplo: marcar "Ler 20 páginas"');
  if (!diario.habitos.includes(habito)) {
    if (!feito) throw new Error(`O hábito "${habito}" não existe. Cadastrados: ${diario.habitos.join(', ') || 'nenhum'}.`);
    diario.habitos.push(habito);
  }
  const doDia = diario.registros[data] || [];
  const jaEstava = doDia.includes(habito);
  if (feito && jaEstava) return `"${habito}" já estava marcado em ${data}.`;
  if (!feito && !jaEstava) return `"${habito}" não estava marcado em ${data}.`;
  diario.registros[data] = feito ? [...doDia, habito] : doDia.filter((h) => h !== habito);
  if (diario.registros[data].length === 0) delete diario.registros[data];
  return `${feito ? 'Marcado' : 'Desmarcado'}: "${habito}" em ${data}.`;
}

function resumo(diario, hoje, semanas) {
  if (diario.habitos.length === 0) return 'Nenhum hábito registrado ainda. Comece com: marcar "nome do hábito"';
  const totalDias = semanas * 7;
  const inicio = somarDias(hoje, -(totalDias - 1));
  // Array.from com { length } gera a lista de datas do período, uma por dia.
  const dias = Array.from({ length: totalDias }, (_, i) => somarDias(inicio, i));
  const porSemana = Array.from({ length: semanas }, (_, s) => dias.slice(s * 7, s * 7 + 7));
  const largura = Math.max(...diario.habitos.map((h) => h.length), 6);
  const linhaGrade = (celulaDe) => porSemana.map((semana) => semana.map(celulaDe).join(' ')).join('   ');

  const linhas = [`Resumo de ${inicio} a ${hoje} (${semanas} semana(s)): x = feito, . = não feito`, ''];
  linhas.push(`${''.padEnd(largura)}  ${linhaGrade((d) => ` ${DIAS_DA_SEMANA[deIso(d).getDay()]}`)}`);
  linhas.push(`${''.padEnd(largura)}  ${linhaGrade((d) => d.slice(8))}   atual  maior  feitos`);
  for (const habito of diario.habitos) {
    const feitos = diasDoHabito(diario, habito);
    const noPeriodo = dias.filter((d) => feitos.has(d)).length;
    const grade = linhaGrade((d) => (feitos.has(d) ? ' x' : ' .'));
    const numeros = `${String(sequenciaAtual(feitos, hoje)).padStart(5)}  ${String(maiorSequencia(feitos)).padStart(5)}  ${`${noPeriodo}/${totalDias}`.padStart(6)}`;
    linhas.push(`${habito.padEnd(largura)}  ${grade}  ${numeros}`);
  }
  return linhas.join('\n');
}

// ---------- Linha de comando ----------

function lerArgumentos(argv) {
  const opcoes = {};
  const posicionais = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--') && argv[i + 1] !== undefined) { opcoes[argv[i].slice(2)] = argv[i + 1]; i++; }
    else posicionais.push(argv[i]);
  }
  return { comando: posicionais[0], parametros: posicionais.slice(1), opcoes };
}

function executar(argv, arquivoPadrao, hoje) {
  const { comando, parametros, opcoes } = lerArgumentos(argv);
  const arquivo = opcoes.arquivo || arquivoPadrao;
  const diario = carregar(arquivo);
  const data = opcoes.data === undefined ? hoje : paraIso(deIso(opcoes.data));
  if (data > hoje) throw new Error(`${data} ainda não chegou; só dá para registrar até hoje (${hoje}).`);
  const habito = parametros.join(' ').trim();
  switch (comando) {
    case 'marcar':
    case 'desmarcar': {
      const mensagem = registrar(diario, habito, data, comando === 'marcar');
      salvar(arquivo, diario);
      return `${mensagem} Sequência atual: ${sequenciaAtual(diasDoHabito(diario, habito), hoje)} dia(s).`;
    }
    case 'resumo': {
      const semanas = Number(opcoes.semanas ?? 3);
      if (!Number.isInteger(semanas) || semanas < 1 || semanas > 12) throw new Error(`--semanas aceita de 1 a 12, não "${opcoes.semanas}".`);
      return resumo(diario, hoje, semanas);
    }
    default:
      throw new Error(`Comando desconhecido: "${comando}". Use marcar, desmarcar ou resumo.`);
  }
}

function mostrarUso() {
  console.log(`Uso: node 39_diario_habitos.js <comando> [...] [--data AAAA-MM-DD] [--arquivo habitos.json]

  marcar "hábito"       registra o hábito como feito (hoje, ou na data informada)
  desmarcar "hábito"    remove o registro daquele dia
  resumo [--semanas N]  grade das últimas N semanas (padrão 3) com sequências
  --demo                demonstração com três semanas de registros num arquivo temporário`);
}

// ---------- Demonstração ----------

function demo() {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'codenomad-habitos-'));
  const arquivo = path.join(pasta, 'habitos.json');
  const hoje = paraIso(new Date());
  // Simula três semanas de uso: cada hábito segue um padrão diferente de presença.
  const padroes = {
    'Ler 20 páginas': (atras) => atras !== 4,
    'Correr': (atras) => atras % 2 === 0,
    'Meditar': (atras) => atras >= 8 && atras <= 20,
    'Estudar JavaScript': (atras, dia) => deIso(dia).getDay() >= 1 && deIso(dia).getDay() <= 5,
  };
  const diario = { habitos: Object.keys(padroes), registros: {} };
  for (let atras = 20; atras >= 1; atras--) {
    const dia = somarDias(hoje, -atras);
    const feitos = diario.habitos.filter((h) => padroes[h](atras, dia));
    if (feitos.length > 0) diario.registros[dia] = feitos;
  }
  salvar(arquivo, diario);
  console.log('=== Diário de hábitos: demonstração ===');
  console.log(`Arquivo temporário com 20 dias de registros: ${arquivo}\n`);
  const roteiro = [
    ['marcar', 'Ler 20 páginas'],
    ['marcar', 'Correr', '--data', somarDias(hoje, 1)],
    ['desmarcar', 'Meditar', '--data', somarDias(hoje, -10)],
    ['marcar', 'Alongar'],
    ['resumo', '--semanas', '3'],
    ['resumo', '--semanas', 'muitas'],
  ];
  for (const argv of roteiro) {
    console.log(`$ node 39_diario_habitos.js ${argv.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`);
    try {
      console.log(executar(argv, arquivo, hoje));
    } catch (erro) {
      console.log(`Erro tratado: ${erro.message}`);
    }
    console.log('');
  }
  fs.rmSync(pasta, { recursive: true, force: true });
  console.log('Pasta temporária removida. Fim da demonstração.');
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--demo')) return demo();
  if (argv.length === 0) return mostrarUso();
  try {
    console.log(executar(argv, path.join(process.cwd(), 'habitos.json'), paraIso(new Date())));
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    process.exitCode = 1;
  }
}

main();

/*
 * Para ir além:
 * 1. Crie o comando "remover <hábito>", apagando o hábito e todos os registros dele.
 * 2. Mostre, no resumo, a taxa de acerto por semana (ex.: 5/7) e a melhor semana de cada hábito.
 * 3. Permita metas semanais ("Correr" 3x por semana) e marque a semana como cumprida ou não.
 */
