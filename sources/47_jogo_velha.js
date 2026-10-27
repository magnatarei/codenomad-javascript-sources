/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  47. Jogo da velha com computador
 * ------------------------------------------------------------
 * O que faz: Jogo da velha no terminal contra o computador, que usa o algoritmo
 *            minimax e por isso nunca perde, ou entre duas pessoas. Mostra o
 *            tabuleiro a cada jogada, valida a casa escolhida e detecta vitória
 *            e empate. No --demo o computador joga contra ele mesmo.
 * Como usar: node sources/47_jogo_velha.js                  (você é o X e começa)
 *            node sources/47_jogo_velha.js --maquina-comeca
 *            node sources/47_jogo_velha.js --dois            (duas pessoas)
 *            node sources/47_jogo_velha.js --demo
 * O que você aprende: recursão com minimax, jogar e desfazer no mesmo array,
 *            funções como valores (cada jogador é uma função), async/await com
 *            readline, Array.fill, validação de entrada numérica.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const readline = require('readline');

// As oito formas de vencer: três linhas, três colunas e duas diagonais (casas 0 a 8).
const LINHAS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
let posicoesAvaliadas = 0; // contador só para mostrar o tamanho da busca

function outro(jogador) {
  return jogador === 'X' ? 'O' : 'X';
}

function vencedor(tabuleiro) {
  for (const [a, b, c] of LINHAS) {
    if (tabuleiro[a] && tabuleiro[a] === tabuleiro[b] && tabuleiro[a] === tabuleiro[c]) return tabuleiro[a];
  }
  return null;
}

function casasLivres(tabuleiro) {
  const livres = [];
  tabuleiro.forEach((valor, i) => {
    if (!valor) livres.push(i);
  });
  return livres;
}

function desenhar(tabuleiro) {
  const casa = (i) => tabuleiro[i] || String(i + 1); // casa vazia mostra o seu número
  const linhas = [];
  for (let l = 0; l < 3; l++) {
    const i = l * 3;
    linhas.push(` ${casa(i)} | ${casa(i + 1)} | ${casa(i + 2)} `);
    if (l < 2) linhas.push('---+---+---');
  }
  return linhas.join('\n');
}

/**
 * Minimax: avalia a posição do ponto de vista da máquina, supondo que os dois
 * lados jogam perfeitamente. Vitória vale +10 menos a profundidade (ganhar cedo
 * é melhor), derrota vale -10 mais a profundidade, empate vale 0. A máquina
 * escolhe o máximo nas jogadas dela e o mínimo nas do adversário.
 */
function minimax(tabuleiro, vez, maquina, profundidade) {
  posicoesAvaliadas += 1;
  const quemVenceu = vencedor(tabuleiro);
  if (quemVenceu === maquina) return 10 - profundidade;
  if (quemVenceu) return profundidade - 10;
  const livres = casasLivres(tabuleiro);
  if (livres.length === 0) return 0;
  const maximizando = vez === maquina;
  let melhor = maximizando ? -Infinity : Infinity;
  for (const casa of livres) {
    tabuleiro[casa] = vez; // joga...
    const valor = minimax(tabuleiro, outro(vez), maquina, profundidade + 1);
    tabuleiro[casa] = null; // ...e desfaz: o mesmo array serve para toda a busca
    melhor = maximizando ? Math.max(melhor, valor) : Math.min(melhor, valor);
  }
  return melhor;
}

function melhorJogada(tabuleiro, maquina) {
  let escolhida = -1;
  let melhorValor = -Infinity;
  for (const casa of casasLivres(tabuleiro)) {
    tabuleiro[casa] = maquina;
    const valor = minimax(tabuleiro, outro(maquina), maquina, 1);
    tabuleiro[casa] = null;
    if (valor > melhorValor) {
      melhorValor = valor;
      escolhida = casa;
    }
  }
  return { casa: escolhida, valor: melhorValor };
}

/** Jogador máquina: tem a mesma assinatura do jogador humano, então o laço do jogo não distingue os dois. */
function jogadorMaquina(tabuleiro, vez) {
  posicoesAvaliadas = 0;
  const { casa, valor } = melhorJogada(tabuleiro, vez);
  const leitura = valor > 0 ? 'vai ganhar' : valor < 0 ? 'vai perder' : 'empate à vista';
  const quantas = posicoesAvaliadas === 1 ? '1 posição' : `${posicoesAvaliadas} posições`;
  console.log(`Computador (${vez}) avaliou ${quantas} e escolhe a casa ${casa + 1} (${leitura}).`);
  return casa;
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

function criarJogadorHumano(leitor) {
  return async (tabuleiro, vez) => {
    for (;;) {
      const resposta = await leitor.perguntar(`Jogador ${vez}, escolha a casa (1 a 9): `);
      if (resposta === null) return null;
      const numero = Number(resposta.trim());
      if (!Number.isInteger(numero) || numero < 1 || numero > 9) {
        console.log('Digite um número de 1 a 9.');
      } else if (tabuleiro[numero - 1]) {
        console.log(`A casa ${numero} já está ocupada.`);
      } else {
        return numero - 1;
      }
    }
  };
}

/** Roda uma partida inteira. "jogadores" liga cada símbolo à função que decide a jogada. */
async function jogarPartida(jogadores) {
  const tabuleiro = Array(9).fill(null);
  let vez = 'X';
  let numero = 0;
  console.log(desenhar(tabuleiro));
  while (!vencedor(tabuleiro) && casasLivres(tabuleiro).length > 0) {
    const casa = await jogadores[vez](tabuleiro, vez);
    if (casa === null) {
      console.log('\nEntrada encerrada. Partida abandonada.');
      return null;
    }
    tabuleiro[casa] = vez;
    numero += 1;
    console.log(`\nJogada ${numero}: ${vez} na casa ${casa + 1}`);
    console.log(desenhar(tabuleiro));
    vez = outro(vez);
  }
  const quemVenceu = vencedor(tabuleiro);
  console.log(quemVenceu ? `\n${quemVenceu} venceu!` : '\nEmpate: deu velha.');
  return quemVenceu || 'empate';
}

async function demonstracao() {
  console.log('=== Demonstração: computador contra computador ===');
  console.log('Os dois lados usam minimax, então a partida sempre termina empatada.\n');
  await jogarPartida({ X: jogadorMaquina, O: jogadorMaquina });
}

function lerArgumentos(lista) {
  const conhecidas = ['dois', 'maquina-comeca', 'demo'];
  const opcoes = {};
  for (const item of lista) {
    if (!item.startsWith('--')) throw new Error(`argumento inesperado: "${item}"`);
    if (!conhecidas.includes(item.slice(2))) throw new Error(`opção desconhecida: ${item}`);
    opcoes[item.slice(2)] = true;
  }
  return opcoes;
}

async function principal() {
  let opcoes;
  try {
    opcoes = lerArgumentos(process.argv.slice(2));
  } catch (erro) {
    console.error(`Erro: ${erro.message}\nUso: node 47_jogo_velha.js [--dois | --maquina-comeca] | --demo`);
    process.exitCode = 1;
    return;
  }
  if (opcoes.demo) return demonstracao();
  const leitor = criarLeitor();
  const humano = criarJogadorHumano(leitor);
  let jogadores;
  if (opcoes.dois) {
    console.log('=== Jogo da velha: duas pessoas ===');
    jogadores = { X: humano, O: humano };
  } else if (opcoes['maquina-comeca']) {
    console.log('=== Jogo da velha: o computador é o X e começa ===');
    jogadores = { X: jogadorMaquina, O: humano };
  } else {
    console.log('=== Jogo da velha: você é o X e começa ===');
    jogadores = { X: humano, O: jogadorMaquina };
  }
  await jogarPartida(jogadores);
  leitor.fechar();
}

principal();

/*
 * Para ir além:
 *   1. Acrescente poda alfa-beta ao minimax e compare o contador de posições avaliadas.
 *   2. Crie um nível "fácil" em que o computador joga numa casa livre aleatória metade das vezes.
 *   3. Generalize para um tabuleiro 4x4 (com quatro em linha) e veja por que a busca fica lenta.
 */
