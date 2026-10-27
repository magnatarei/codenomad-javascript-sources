/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  44. Cronômetro Pomodoro no terminal
 * ------------------------------------------------------------
 * O que faz: Alterna ciclos de foco e pausa com contagem regressiva na mesma
 *            linha do terminal, barra de progresso, aviso sonoro ao fim de cada
 *            ciclo e pausa longa a cada quatro focos. Durações em minutos
 *            (25) ou em segundos (90s). Ctrl+C mostra o resumo da sessão.
 * Como usar: node sources/44_cronometro_pomodoro.js --foco 25 --pausa 5 --longa 15 --ciclos 4
 *            node sources/44_cronometro_pomodoro.js --iniciar          (usa os valores acima)
 *            node sources/44_cronometro_pomodoro.js --demo
 * O que você aprende: async/await com setTimeout embrulhado em Promise, relógio
 *            de verdade (Date.now) para não acumular atraso, process.stdout.write
 *            com "\r" para reescrever a linha, isTTY, sinal SIGINT, expressão regular.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const PADRAO = { foco: '25', pausa: '5', longa: '15', ciclos: '4' };
const LARGURA_BARRA = 20;

// Estado da sessão fica no módulo para o tratador de Ctrl+C conseguir ler.
const sessao = { concluidos: 0, inicio: 0 };

/** Converte "25" (minutos) ou "90s" (segundos) para segundos inteiros. */
function lerDuracao(texto, nome) {
  const m = /^(\d+)(s|m)?$/i.exec(String(texto).trim());
  if (!m) throw new Error(`--${nome} precisa ser minutos (ex.: 25) ou segundos com s (ex.: 90s); recebi "${texto}"`);
  const valor = Number(m[1]);
  const segundos = (m[2] || 'm').toLowerCase() === 's' ? valor : valor * 60;
  if (segundos <= 0) throw new Error(`--${nome} precisa ser maior que zero`);
  return segundos;
}

function formatarTempo(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function desenharBarra(fracao) {
  const cheios = Math.round(fracao * LARGURA_BARRA);
  return `[${'#'.repeat(cheios)}${'-'.repeat(LARGURA_BARRA - cheios)}]`;
}

/** setTimeout dentro de uma Promise: assim dá para escrever "await dormir(1000)". */
function dormir(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Conta de "segundos" até zero. No terminal, reescreve a mesma linha com "\r".
 * Quando a saída vai para um arquivo (sem TTY), imprime só quatro marcos,
 * senão um ciclo de 25 minutos geraria 1500 linhas.
 */
async function contagemRegressiva(rotulo, segundos) {
  const interativo = Boolean(process.stdout.isTTY);
  const fim = Date.now() + segundos * 1000;
  const passo = interativo ? 1 : Math.max(1, Math.floor(segundos / 4));
  let restante = segundos;
  while (restante > 0) {
    const texto = `${rotulo} ${desenharBarra(1 - restante / segundos)} ${formatarTempo(restante)} restantes`;
    if (interativo) process.stdout.write(`\r${texto}  `);
    else if (restante === segundos || restante % passo === 0) console.log(texto);
    // Ponto de atenção: setTimeout(1000) sempre atrasa um pouco. Se somássemos
    // 1 s por volta, um ciclo de 25 min terminaria segundos depois da hora.
    // Por isso o tempo restante é recalculado a partir do relógio.
    const proximaMarca = fim - (restante - 1) * 1000;
    await dormir(Math.max(0, proximaMarca - Date.now()));
    restante = Math.max(0, Math.ceil((fim - Date.now()) / 1000));
  }
  if (interativo) process.stdout.write(`\r${' '.repeat(60)}\r`);
}

function avisar(mensagem, silencio) {
  if (!silencio) process.stdout.write('\u0007'); // caractere BEL: o terminal toca o aviso sonoro
  console.log(`>> ${mensagem}`);
}

async function rodarSessao(config) {
  sessao.inicio = Date.now();
  for (let ciclo = 1; ciclo <= config.ciclos; ciclo++) {
    console.log(`\nCiclo ${ciclo} de ${config.ciclos}: foco por ${formatarTempo(config.foco)}`);
    await contagemRegressiva('Foco ', config.foco);
    sessao.concluidos += 1;
    avisar(`Foco ${ciclo} concluído. Levante, beba água.`, config.silencio);
    const longa = ciclo % 4 === 0; // a cada quatro focos a pausa é a longa
    const pausa = longa ? config.longa : config.pausa;
    console.log(`Pausa ${longa ? 'longa' : 'curta'} por ${formatarTempo(pausa)}`);
    await contagemRegressiva('Pausa', pausa);
    avisar(ciclo === config.ciclos ? 'Pausa concluída. Sessão encerrada.' : 'Pausa concluída. De volta ao foco.', config.silencio);
  }
  imprimirResumo(config);
}

function imprimirResumo(config) {
  const decorrido = Math.round((Date.now() - sessao.inicio) / 1000);
  console.log('\n== Resumo da sessão ==');
  console.log(`  Focos concluídos: ${sessao.concluidos} de ${config.ciclos}`);
  console.log(`  Tempo em foco:    ${formatarTempo(sessao.concluidos * config.foco)}`);
  console.log(`  Tempo total:      ${formatarTempo(decorrido)}`);
}

async function demonstracao() {
  console.log('=== Demonstração: Pomodoro com ciclos de 2 segundos ===');
  console.log('Na vida real: node sources/44_cronometro_pomodoro.js --foco 25 --pausa 5 --ciclos 4');
  console.log('Aqui cada ciclo dura 2 s, só para mostrar a contagem, o aviso e o resumo.');
  await rodarSessao({ foco: 2, pausa: 2, longa: 2, ciclos: 1, silencio: true });
}

function lerArgumentos(lista) {
  const opcoes = {};
  for (let i = 0; i < lista.length; i++) {
    if (!lista[i].startsWith('--')) throw new Error(`argumento inesperado: "${lista[i]}"`);
    const temValor = lista[i + 1] !== undefined && !lista[i + 1].startsWith('--');
    opcoes[lista[i].slice(2)] = temValor ? lista[++i] : true;
  }
  return opcoes;
}

function uso() {
  console.log('Uso: node 44_cronometro_pomodoro.js [--foco 25] [--pausa 5] [--longa 15] [--ciclos 4] [--silencio]');
  console.log('     node 44_cronometro_pomodoro.js --iniciar      (valores padrão)');
  console.log('     node 44_cronometro_pomodoro.js --demo');
  console.log('Durações em minutos; acrescente "s" para segundos (ex.: --foco 90s).');
}

async function principal() {
  let opcoes;
  try {
    opcoes = lerArgumentos(process.argv.slice(2));
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    uso();
    process.exitCode = 1;
    return;
  }
  if (opcoes.demo) return demonstracao();
  if (opcoes.ajuda || Object.keys(opcoes).length === 0) {
    uso();
    process.exitCode = opcoes.ajuda ? 0 : 1;
    return;
  }
  let config;
  try {
    const ciclos = Number(opcoes.ciclos ?? PADRAO.ciclos);
    if (!Number.isInteger(ciclos) || ciclos < 1 || ciclos > 50) throw new Error(`--ciclos precisa ser um inteiro de 1 a 50; recebi "${opcoes.ciclos}"`);
    config = {
      foco: lerDuracao(opcoes.foco ?? PADRAO.foco, 'foco'),
      pausa: lerDuracao(opcoes.pausa ?? PADRAO.pausa, 'pausa'),
      longa: lerDuracao(opcoes.longa ?? PADRAO.longa, 'longa'),
      ciclos,
      silencio: Boolean(opcoes.silencio),
    };
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    process.exitCode = 1;
    return;
  }
  process.on('SIGINT', () => {
    console.log('\n\nInterrompido pelo usuário.');
    imprimirResumo(config);
    process.exit(0);
  });
  console.log(`Sessão: ${config.ciclos} ciclo(s) de ${formatarTempo(config.foco)} de foco, pausas de ${formatarTempo(config.pausa)} (longa: ${formatarTempo(config.longa)}). Ctrl+C para parar.`);
  await rodarSessao(config);
}

principal();

/*
 * Para ir além:
 *   1. Deixe pausar e retomar com a tecla "p" lendo process.stdin em modo raw (setRawMode).
 *   2. Grave cada foco concluído num arquivo historico.csv com data, hora e duração.
 *   3. Mostre o título do que você está fazendo (--tarefa "estudar JavaScript") no resumo e na barra.
 */
