/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  46. Jogo da forca
 * ------------------------------------------------------------
 * O que faz: Sorteia uma palavra do banco (cada uma com dica), desenha a forca
 *            em texto a cada erro, mostra as letras já tentadas e decide
 *            vitória ou derrota. No modo --demo um jogador automático joga uma
 *            partida inteira, escolhendo letras ao filtrar o banco de palavras.
 * Como usar: node sources/46_jogo_forca.js                       (palavra sorteada)
 *            node sources/46_jogo_forca.js --palavra foguete --dica "sobe com barulho"
 *            node sources/46_jogo_forca.js --demo
 * O que você aprende: Set para letras tentadas, spread de string em letras,
 *            normalize para tirar acentos, template strings no desenho,
 *            readline com iterador assíncrono e await, filtro de candidatas com every.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const readline = require('readline');

const MAX_ERROS = 6;
// Letras do português em ordem aproximada de frequência: reserva do jogador automático.
const FREQUENCIA = 'aeosrindmutclpvgqbfhzjxkwy';
const BANCO = [
  { palavra: 'girassol', dica: 'flor que acompanha o sol' },
  { palavra: 'teclado', dica: 'fica debaixo dos seus dedos' },
  { palavra: 'algoritmo', dica: 'receita de passos para o computador' },
  { palavra: 'biblioteca', dica: 'casa dos livros e do código reaproveitado' },
  { palavra: 'foguete', dica: 'sobe com muito barulho' },
  { palavra: 'tartaruga', dica: 'carrega a casa nas costas' },
  { palavra: 'chocolate', dica: 'doce feito de cacau' },
  { palavra: 'montanha', dica: 'bem mais alta que um morro' },
  { palavra: 'pinguim', dica: 'ave de smoking que não voa' },
  { palavra: 'laranja', dica: 'fruta e cor ao mesmo tempo' },
  { palavra: 'computador', dica: 'a máquina que roda este programa' },
  { palavra: 'elefante', dica: 'o maior animal que anda na terra' },
];

/** Tira acentos e caixa alta: "Ç" vira "c", "É" vira "e". */
function normalizar(texto) {
  return texto.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase().trim();
}

function desenharForca(erros) {
  const cabeca = erros > 0 ? 'O' : ' ';
  const tronco = erros > 1 ? '|' : ' ';
  const bracoEsq = erros > 2 ? '/' : ' ';
  const bracoDir = erros > 3 ? '\\' : ' ';
  const pernaEsq = erros > 4 ? '/' : ' ';
  const pernaDir = erros > 5 ? '\\' : ' ';
  return ['  +---+', '  |   |', `  ${cabeca}   |`, ` ${bracoEsq}${tronco}${bracoDir}  |`, ` ${pernaEsq} ${pernaDir}  |`, '      |', '========='].join('\n');
}

function criarJogo({ palavra, dica }) {
  return { palavra, dica, acertos: new Set(), erros: new Set() };
}

function mascarar(jogo) {
  return [...jogo.palavra].map((letra) => (jogo.acertos.has(letra) ? letra : '_')).join(' ');
}

/** Registra uma tentativa e devolve 'invalida', 'repetida', 'acerto' ou 'erro'. */
function tentar(jogo, entrada) {
  const letra = normalizar(entrada);
  if (!/^[a-z]$/.test(letra)) return 'invalida';
  if (jogo.acertos.has(letra) || jogo.erros.has(letra)) return 'repetida';
  if (jogo.palavra.includes(letra)) {
    jogo.acertos.add(letra);
    return 'acerto';
  }
  jogo.erros.add(letra);
  return 'erro';
}

function situacao(jogo) {
  if ([...jogo.palavra].every((letra) => jogo.acertos.has(letra))) return 'vitoria';
  if (jogo.erros.size >= MAX_ERROS) return 'derrota';
  return 'andamento';
}

function mostrarRodada(jogo) {
  console.log(desenharForca(jogo.erros.size));
  console.log(`Palavra: ${mascarar(jogo)}   Dica: ${jogo.dica}`);
  console.log(`Erros (${jogo.erros.size} de ${MAX_ERROS}): ${[...jogo.erros].join(' ') || 'nenhum'}`);
}

function mostrarFim(jogo) {
  if (situacao(jogo) === 'vitoria') console.log(`\nVocê venceu! A palavra era "${jogo.palavra}", com ${jogo.erros.size} erro(s).`);
  else console.log(`\nEnforcado! A palavra era "${jogo.palavra}".`);
}

/**
 * Leitor de linhas em cima do readline. O iterador assíncrono guarda as linhas
 * que chegam antes de alguém pedir, então funciona tanto no terminal quanto
 * com entrada vinda de um arquivo ("node 46_jogo_forca.js < jogadas.txt").
 * Com rl.question, as linhas que chegassem antes da pergunta se perderiam.
 */
function criarLeitor() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const linhas = rl[Symbol.asyncIterator]();
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

async function jogarInterativo(entrada) {
  const leitor = criarLeitor();
  const jogo = criarJogo(entrada);
  const mensagens = { invalida: 'Digite uma única letra, de A a Z.', repetida: 'Você já tentou essa letra.', acerto: 'Boa! Tem essa letra.', erro: 'Não tem. Cuidado com a corda.' };
  console.log('=== Jogo da forca ===');
  while (situacao(jogo) === 'andamento') {
    mostrarRodada(jogo);
    const resposta = await leitor.perguntar('Letra: ');
    if (resposta === null) {
      console.log('\nEntrada encerrada. Até a próxima.');
      leitor.fechar();
      return;
    }
    console.log(mensagens[tentar(jogo, resposta)]);
  }
  mostrarRodada(jogo);
  mostrarFim(jogo);
  leitor.fechar();
}

/**
 * Jogador automático: mantém só as palavras do banco compatíveis com o que já
 * se sabe (tamanho, letras reveladas e letras erradas) e tenta a letra mais
 * comum entre elas. Se nenhuma for compatível, cai na ordem de frequência.
 */
function escolherLetraAutomatica(jogo) {
  const tentadas = new Set([...jogo.acertos, ...jogo.erros]);
  const mascara = [...jogo.palavra].map((letra) => (jogo.acertos.has(letra) ? letra : null));
  const candidatas = BANCO.map((e) => e.palavra).filter((p) => p.length === mascara.length
    && [...p].every((letra, i) => (mascara[i] ? mascara[i] === letra : !tentadas.has(letra))));
  const contagem = new Map();
  for (const palavra of candidatas) {
    for (const letra of new Set(palavra)) {
      if (!tentadas.has(letra)) contagem.set(letra, (contagem.get(letra) || 0) + 1);
    }
  }
  const ordenadas = [...contagem.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const letra = ordenadas.length ? ordenadas[0][0] : [...FREQUENCIA].find((l) => !tentadas.has(l));
  return { letra, candidatas };
}

function demonstracao() {
  console.log('=== Demonstração: jogador automático numa partida completa ===');
  // Palavra fora do banco de propósito: assim o jogador automático erra algumas vezes e a forca aparece.
  const jogo = criarJogo({ palavra: 'terminal', dica: 'onde este jogo roda' });
  let rodada = 0;
  while (situacao(jogo) === 'andamento') {
    rodada += 1;
    const { letra, candidatas } = escolherLetraAutomatica(jogo);
    const resultado = tentar(jogo, letra);
    console.log(`\nRodada ${rodada}: ${mascarar(jogo)}  tenta "${letra}" (${candidatas.length} candidata(s): ${candidatas.join(', ') || 'nenhuma'}) -> ${resultado}`);
    if (resultado === 'erro') console.log(desenharForca(jogo.erros.size));
  }
  mostrarRodada(jogo);
  mostrarFim(jogo);
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
    console.error(`Erro: ${erro.message}\nUso: node 46_jogo_forca.js [--palavra x --dica "y"] | --demo`);
    process.exitCode = 1;
    return;
  }
  if (opcoes.demo) return demonstracao();
  let entrada = BANCO[Math.floor(Math.random() * BANCO.length)];
  if (opcoes.palavra !== undefined) {
    const palavra = normalizar(String(opcoes.palavra));
    if (!/^[a-z]{2,}$/.test(palavra)) {
      console.error(`Erro: --palavra precisa ter só letras, sem espaços (recebi "${opcoes.palavra}")`);
      process.exitCode = 1;
      return;
    }
    entrada = { palavra, dica: typeof opcoes.dica === 'string' ? opcoes.dica : 'sem dica' };
  }
  await jogarInterativo(entrada);
}

principal();

/*
 * Para ir além:
 *   1. Leia as palavras de um arquivo texto (uma por linha, "palavra;dica") em vez do banco fixo.
 *   2. Permita chutar a palavra inteira: acertou, venceu; errou, conta dois erros.
 *   3. Guarde um placar em JSON com vitórias, derrotas e a palavra mais difícil (mais erros em média).
 */
