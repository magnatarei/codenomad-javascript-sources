/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  49. Pedra, papel e tesoura com placar
 * ------------------------------------------------------------
 * O que faz: Partida "melhor de N" contra o computador, com placar a cada
 *            rodada. O computador conta as suas jogadas e passa a jogar o que
 *            vence a jogada que você mais usa; no fim ele conta o que aprendeu.
 *            Aceita pedra, papel, tesoura, os atalhos pe, pa, te ou 1, 2, 3.
 * Como usar: node sources/49_pedra_papel_tesoura.js --rodadas 5
 *            node sources/49_pedra_papel_tesoura.js             (melhor de 3)
 *            node sources/49_pedra_papel_tesoura.js --demo
 * O que você aprende: objetos como tabelas de regras, Object.entries e
 *            fromEntries para inverter um mapa, contagem com reduce, gerador
 *            aleatório com semente (resultado reproduzível), readline com await.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const readline = require('readline');

const JOGADAS = ['pedra', 'papel', 'tesoura'];
const VENCE = { pedra: 'tesoura', papel: 'pedra', tesoura: 'papel' }; // a chave vence o valor
// Mapa invertido: para cada jogada, qual é a que vence ela. { tesoura: 'pedra', pedra: 'papel', papel: 'tesoura' }
const CONTRA = Object.fromEntries(Object.entries(VENCE).map(([vencedora, perdedora]) => [perdedora, vencedora]));
const ATALHOS = { 1: 'pedra', 2: 'papel', 3: 'tesoura', pe: 'pedra', pa: 'papel', te: 'tesoura', t: 'tesoura' };

/**
 * Gerador pseudoaleatório com semente (algoritmo mulberry32). Com a mesma
 * semente a sequência é sempre igual, por isso a demonstração é reproduzível.
 * Math.random não aceita semente.
 */
function criarAleatorio(semente) {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function interpretarJogada(texto) {
  const limpo = texto.trim().toLowerCase();
  if (JOGADAS.includes(limpo)) return limpo;
  return ATALHOS[limpo] || null;
}

function resultadoRodada(jogador, computador) {
  if (jogador === computador) return 'empate';
  return VENCE[jogador] === computador ? 'jogador' : 'computador';
}

function contarJogadas(historico) {
  return historico.reduce((contagem, jogada) => {
    contagem[jogada] += 1;
    return contagem;
  }, { pedra: 0, papel: 0, tesoura: 0 });
}

/** Estratégia: supõe que o jogador vai repetir a jogada mais usada e joga a que vence essa. */
function escolherComputador(historico, aleatorio) {
  if (historico.length === 0) return JOGADAS[Math.floor(aleatorio() * 3)]; // sem histórico, sorteia
  const contagem = contarJogadas(historico);
  const maisUsada = JOGADAS.reduce((melhor, jogada) => (contagem[jogada] > contagem[melhor] ? jogada : melhor));
  return CONTRA[maisUsada];
}

function criarPartida(melhorDe) {
  return { melhorDe, necessarias: Math.ceil(melhorDe / 2), placar: { jogador: 0, computador: 0, empate: 0 }, historico: [] };
}

function jogarRodada(partida, jogada, aleatorio) {
  const computador = escolherComputador(partida.historico, aleatorio); // decide antes de ver a sua jogada
  const resultado = resultadoRodada(jogada, computador);
  partida.historico.push(jogada);
  partida.placar[resultado] += 1;
  return { computador, resultado };
}

function terminou(partida) {
  return partida.placar.jogador >= partida.necessarias || partida.placar.computador >= partida.necessarias;
}

function descreverRodada(numero, jogada, { computador, resultado }, partida) {
  const frases = { empate: 'empate', jogador: 'você venceu', computador: 'o computador venceu' };
  const { placar } = partida;
  return `Rodada ${numero}: você ${jogada} x ${computador} computador -> ${frases[resultado]}. Placar: ${placar.jogador} a ${placar.computador} (${placar.empate} empate(s))`;
}

function mostrarFinal(partida) {
  const { placar } = partida;
  const contagem = contarJogadas(partida.historico);
  const maisUsada = JOGADAS.reduce((melhor, jogada) => (contagem[jogada] > contagem[melhor] ? jogada : melhor));
  console.log('\n== Resultado ==');
  if (placar.jogador > placar.computador) console.log(`Você venceu a partida por ${placar.jogador} a ${placar.computador}.`);
  else if (placar.computador > placar.jogador) console.log(`O computador venceu a partida por ${placar.computador} a ${placar.jogador}.`);
  else console.log(`Partida empatada em ${placar.jogador} a ${placar.computador}.`);
  console.log(`O que o computador aprendeu: você jogou pedra ${contagem.pedra}x, papel ${contagem.papel}x, tesoura ${contagem.tesoura}x.`);
  console.log(`Jogada mais usada: ${maisUsada}; por isso ele passou a responder com ${CONTRA[maisUsada]}.`);
}

function criarLeitor() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const linhas = rl[Symbol.asyncIterator](); // guarda as linhas que chegam antes de alguém pedir
  return {
    async perguntar(texto) {
      rl.setPrompt(texto);
      rl.prompt();
      const { value, done } = await linhas.next();
      return done ? null : value; // null: a entrada acabou (Ctrl+D ou fim do arquivo)
    },
    fechar: () => rl.close(),
  };
}

async function jogarInterativo(melhorDe) {
  const leitor = criarLeitor();
  const partida = criarPartida(melhorDe);
  console.log(`=== Pedra, papel e tesoura: melhor de ${melhorDe} (vence quem fizer ${partida.necessarias}) ===`);
  console.log('Digite pedra, papel ou tesoura (ou pe, pa, te, 1, 2, 3). "sair" encerra.');
  let numero = 0;
  while (!terminou(partida)) {
    const resposta = await leitor.perguntar(`Sua jogada: `);
    if (resposta === null || resposta.trim().toLowerCase() === 'sair') {
      console.log('\nPartida encerrada antes do fim.');
      break;
    }
    const jogada = interpretarJogada(resposta);
    if (!jogada) {
      console.log('Não entendi. Use pedra, papel, tesoura, pe, pa, te ou 1, 2, 3.');
      continue;
    }
    numero += 1;
    console.log(descreverRodada(numero, jogada, jogarRodada(partida, jogada, Math.random), partida));
  }
  if (partida.historico.length > 0) mostrarFinal(partida);
  leitor.fechar();
}

function demonstracao() {
  console.log('=== Demonstração: 7 rodadas com jogadas pré-definidas (semente fixa) ===');
  const jogadas = ['pedra', 'pedra', 'papel', 'pedra', 'tesoura', 'tesoura', 'papel'];
  const aleatorio = criarAleatorio(2026);
  const partida = criarPartida(jogadas.length);
  console.log(`Melhor de ${partida.melhorDe}: vence quem fizer ${partida.necessarias} pontos.\n`);
  jogadas.forEach((jogada, i) => {
    if (terminou(partida)) return;
    console.log(descreverRodada(i + 1, jogada, jogarRodada(partida, jogada, aleatorio), partida));
  });
  mostrarFinal(partida);
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

async function principal() {
  let opcoes;
  try {
    opcoes = lerArgumentos(process.argv.slice(2));
  } catch (erro) {
    console.error(`Erro: ${erro.message}\nUso: node 49_pedra_papel_tesoura.js [--rodadas 5] | --demo`);
    process.exitCode = 1;
    return;
  }
  if (opcoes.demo) return demonstracao();
  const rodadas = Number(opcoes.rodadas ?? 3);
  if (!Number.isInteger(rodadas) || rodadas < 1 || rodadas > 21 || rodadas % 2 === 0) {
    console.error(`Erro: --rodadas precisa ser um inteiro ímpar de 1 a 21 (recebi "${opcoes.rodadas}")`);
    process.exitCode = 1;
    return;
  }
  await jogarInterativo(rodadas);
}

principal();

/*
 * Para ir além:
 *   1. Troque a estratégia: olhe só as três últimas jogadas em vez do histórico inteiro e compare quem ganha mais.
 *   2. Acrescente "lagarto" e "Spock" (cinco jogadas): só a tabela VENCE precisa mudar.
 *   3. Faça duas estratégias jogarem 1000 rodadas entre si com o gerador de semente e some os resultados.
 */
