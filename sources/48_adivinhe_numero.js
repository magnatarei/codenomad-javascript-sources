/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  48. Adivinhe o número, nos dois sentidos
 * ------------------------------------------------------------
 * O que faz: Modo 1 (--eu): o computador pensa num número e você adivinha com
 *            dicas de "maior" ou "menor". Modo 2 (--computador): você pensa
 *            no número e o computador adivinha por busca binária, acertando
 *            qualquer número de 1 a 100 em no máximo 7 tentativas.
 * Como usar: node sources/48_adivinhe_numero.js --eu --max 100
 *            node sources/48_adivinhe_numero.js --computador --max 1000
 *            node sources/48_adivinhe_numero.js --demo
 * O que você aprende: busca binária, funções que recebem funções (o mesmo
 *            laço serve para pessoa e para jogador automático), Math.log2,
 *            Math.random com intervalo, validação de inteiros, readline com await.
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const readline = require('readline');

const MAX_PADRAO = 100;

/** Quantas tentativas a busca binária precisa, no pior caso, para 1..maximo. */
function tentativasGarantidas(maximo) {
  return Math.floor(Math.log2(maximo)) + 1;
}

/** Compara o palpite com o segredo: 'maior' quer dizer "o segredo é maior que o palpite". */
function comparar(segredo, palpite) {
  if (palpite === segredo) return 'certo';
  return segredo > palpite ? 'maior' : 'menor';
}

/**
 * Modo 1: alguém tenta adivinhar "segredo". "pedirPalpite" é uma função que
 * devolve o próximo palpite (ou null para desistir); quem chama decide se
 * ela pergunta a uma pessoa ou calcula sozinha.
 */
async function jogarVoceAdivinha(segredo, maximo, pedirPalpite) {
  let tentativas = 0;
  for (;;) {
    const palpite = await pedirPalpite(tentativas + 1);
    if (palpite === null) return null;
    tentativas += 1;
    const dica = comparar(segredo, palpite);
    if (dica === 'certo') {
      console.log(`Acertou em ${tentativas} tentativa(s)! A busca binária garante no máximo ${tentativasGarantidas(maximo)} para 1 a ${maximo}.`);
      return tentativas;
    }
    console.log(dica === 'maior' ? 'Meu número é maior.' : 'Meu número é menor.');
  }
}

/**
 * Modo 2: o computador adivinha por busca binária. A cada palpite, "responder"
 * devolve 'maior', 'menor' ou 'certo' (ou null para desistir). Como o intervalo
 * cai pela metade a cada rodada, 100 números cabem em 7 palpites e 1000 em 10.
 */
async function jogarComputadorAdivinha(maximo, responder) {
  let baixo = 1;
  let alto = maximo;
  let tentativas = 0;
  while (baixo <= alto) {
    const palpite = Math.floor((baixo + alto) / 2);
    tentativas += 1;
    const resposta = await responder(palpite, tentativas, baixo, alto);
    if (resposta === null) return null;
    if (resposta === 'certo') {
      console.log(`Acertei em ${tentativas} tentativa(s)!`);
      return tentativas;
    }
    if (resposta === 'maior') baixo = palpite + 1;
    else alto = palpite - 1;
  }
  console.log('As respostas se contradizem: não sobrou nenhum número possível. Confira as dicas que você deu.');
  return null;
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

async function modoEuInterativo(leitor, maximo) {
  const segredo = 1 + Math.floor(Math.random() * maximo); // inteiro de 1 a maximo
  console.log(`Pensei num número de 1 a ${maximo}. Tente adivinhar.`);
  const pedirPalpite = async (numero) => {
    for (;;) {
      const resposta = await leitor.perguntar(`Palpite ${numero}: `);
      if (resposta === null) return null;
      const palpite = Number(resposta.trim());
      if (Number.isInteger(palpite) && palpite >= 1 && palpite <= maximo) return palpite;
      console.log(`Digite um inteiro de 1 a ${maximo}.`);
    }
  };
  const resultado = await jogarVoceAdivinha(segredo, maximo, pedirPalpite);
  if (resultado === null) console.log(`\nEntrada encerrada. O número era ${segredo}.`);
}

async function modoComputadorInterativo(leitor, maximo) {
  console.log(`Pense num número de 1 a ${maximo}. Para cada palpite responda: m (o seu é maior), n (o seu é menor) ou c (certo).`);
  const responder = async (palpite, tentativa, baixo, alto) => {
    for (;;) {
      const resposta = await leitor.perguntar(`Tentativa ${tentativa} (entre ${baixo} e ${alto}): é ${palpite}? [m/n/c] `);
      if (resposta === null) return null;
      const letra = resposta.trim().toLowerCase();
      if (letra === 'm') return 'maior';
      if (letra === 'n') return 'menor';
      if (letra === 'c') return 'certo';
      console.log('Responda m, n ou c.');
    }
  };
  const resultado = await jogarComputadorAdivinha(maximo, responder);
  if (resultado === null) console.log('\nPartida encerrada.');
}

async function demonstracao() {
  console.log('=== Demonstração 1: o computador adivinha o número 73 entre 1 e 100 ===');
  const segredo = 73;
  await jogarComputadorAdivinha(100, (palpite, tentativa, baixo, alto) => {
    const resposta = comparar(segredo, palpite);
    console.log(`Tentativa ${tentativa}: intervalo ${baixo}..${alto}, palpite ${palpite} -> ${resposta}`);
    return resposta;
  });

  console.log('\n=== Demonstração 2: um jogador automático adivinha o número 42 do computador ===');
  const alvo = 42;
  let baixo = 1;
  let alto = 100;
  await jogarVoceAdivinha(alvo, 100, (numero) => {
    const palpite = Math.floor((baixo + alto) / 2);
    console.log(`Palpite ${numero}: ${palpite}`);
    if (alvo > palpite) baixo = palpite + 1; // usa a mesma dica que a pessoa receberia
    else if (alvo < palpite) alto = palpite - 1;
    return palpite;
  });

  console.log('\nTentativas garantidas pela busca binária:');
  for (const maximo of [10, 100, 1000, 1000000]) console.log(`  1 a ${maximo}: ${tentativasGarantidas(maximo)}`);
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
  console.log('Uso: node 48_adivinhe_numero.js (--eu | --computador) [--max 100]');
  console.log('     node 48_adivinhe_numero.js --demo');
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
  const maximo = Number(opcoes.max ?? MAX_PADRAO);
  if (!Number.isInteger(maximo) || maximo < 2 || maximo > 1e9) {
    console.error(`Erro: --max precisa ser um inteiro entre 2 e 1000000000 (recebi "${opcoes.max}")`);
    process.exitCode = 1;
    return;
  }
  if (!opcoes.eu && !opcoes.computador) {
    uso();
    process.exitCode = 1;
    return;
  }
  const leitor = criarLeitor();
  if (opcoes.eu) await modoEuInterativo(leitor, maximo);
  else await modoComputadorInterativo(leitor, maximo);
  leitor.fechar();
}

principal();

/*
 * Para ir além:
 *   1. No modo --eu, mostre ao fim quantas tentativas a busca binária teria usado e compare com as suas.
 *   2. Deixe o computador adivinhar com busca ternária (dois palpites por rodada) e compare o total de rodadas.
 *   3. Guarde um recorde por intervalo num arquivo JSON e avise quando o jogador bater o recorde.
 */
