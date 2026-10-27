/**
 * ============================================================
 * CodeNomad Academy  |  Sources JavaScript  |  15. Cifra de César e de Vigenère
 * ------------------------------------------------------------
 * O que faz: Codifica e decodifica textos com a cifra de César (um
 *            deslocamento fixo) e a de Vigenère (uma palavra-chave),
 *            preservando maiúsculas, espaços e pontuação. Inclui um
 *            quebrador de César que descobre a chave comparando a
 *            frequência das letras com a do português.
 * Como usar: node 15_cifra_cesar_vigenere.js cesar 3 "Olá, mundo!"
 *            node 15_cifra_cesar_vigenere.js vigenere limao "Texto secreto"
 *            node 15_cifra_cesar_vigenere.js quebrar "Rod, pxqgr!"
 *            node 15_cifra_cesar_vigenere.js --demo
 * O que você aprende: charCodeAt e fromCharCode, aritmética modular com
 *            números negativos, map sobre strings, objetos como tabelas de
 *            consulta e o teste qui-quadrado como medida de "parece português".
 * Requisitos: Node.js 18+, só biblioteca padrão
 * Licença MIT. Um projeto da CodeNomad Academy (codenomad.org)
 * ============================================================
 */
'use strict';

const ALFABETO = 'abcdefghijklmnopqrstuvwxyz';

// Frequência (%) de cada letra em textos de português. Serve para "farejar"
// qual deslocamento produz o texto mais parecido com a língua.
const FREQUENCIA_PT = {
  a: 14.63, b: 1.04, c: 3.88, d: 4.99, e: 12.57, f: 1.02, g: 1.30, h: 1.28, i: 6.18,
  j: 0.40, k: 0.02, l: 2.78, m: 4.74, n: 5.05, o: 10.73, p: 2.52, q: 1.20, r: 6.53,
  s: 7.81, t: 4.34, u: 4.63, v: 1.67, w: 0.01, x: 0.21, y: 0.01, z: 0.47,
};

/**
 * Desloca uma única letra dentro do alfabeto, mantendo a caixa. Qualquer
 * outro símbolo (espaço, vírgula, letra acentuada) volta sem mudança.
 */
function deslocarLetra(letra, deslocamento) {
  let codigoBase = null;
  if (letra >= 'a' && letra <= 'z') codigoBase = 97;
  if (letra >= 'A' && letra <= 'Z') codigoBase = 65;
  if (codigoBase === null) return letra;
  const posicaoAtual = letra.charCodeAt(0) - codigoBase;
  // ((x % 26) + 26) % 26 garante um valor de 0 a 25 mesmo com deslocamento negativo.
  const novaPosicao = (((posicaoAtual + deslocamento) % 26) + 26) % 26;
  return String.fromCharCode(codigoBase + novaPosicao);
}

/** César: o mesmo deslocamento em todas as letras. Decifrar é usar o deslocamento negativo. */
function cesar(texto, deslocamento) {
  return [...texto].map((letra) => deslocarLetra(letra, deslocamento)).join('');
}

/**
 * Vigenère: cada letra do texto usa a letra correspondente da chave como
 * deslocamento (a = 0, b = 1, ...). A chave só avança nas letras, para que
 * espaços e pontuação não quebrem o alinhamento na hora de decifrar.
 */
function vigenere(texto, chave, decifrar = false) {
  const chaveLimpa = chave.toLowerCase().replace(/[^a-z]/g, '');
  if (chaveLimpa.length === 0) throw new Error('a chave precisa ter pelo menos uma letra de a a z');
  let letrasVistas = 0;
  return [...texto].map((letra) => {
    if (!/[a-z]/i.test(letra)) return letra;
    const deslocamento = chaveLimpa.charCodeAt(letrasVistas % chaveLimpa.length) - 97;
    letrasVistas++;
    return deslocarLetra(letra, decifrar ? -deslocamento : deslocamento);
  }).join('');
}

/**
 * Qui-quadrado: soma de (observado - esperado)² / esperado para cada letra.
 * Quanto menor o valor, mais a distribuição das letras se parece com a do
 * português. Texto curto demais engana a medida; a partir de uma frase
 * longa ela acerta quase sempre.
 */
function quiQuadrado(texto) {
  const letras = texto.toLowerCase().replace(/[^a-z]/g, '');
  if (letras.length === 0) return Infinity;
  const contagem = {};
  for (const letra of letras) contagem[letra] = (contagem[letra] || 0) + 1;
  let soma = 0;
  for (const letra of ALFABETO) {
    const esperado = (FREQUENCIA_PT[letra] / 100) * letras.length;
    const observado = contagem[letra] || 0;
    soma += (observado - esperado) ** 2 / esperado;
  }
  return soma;
}

/** Testa os 26 deslocamentos e devolve todos, do mais provável ao menos provável. */
function quebrarCesar(cifrado) {
  const candidatos = [];
  for (let deslocamento = 0; deslocamento < 26; deslocamento++) {
    const texto = cesar(cifrado, -deslocamento);
    candidatos.push({ deslocamento, texto, pontuacao: quiQuadrado(texto) });
  }
  return candidatos.sort((a, b) => a.pontuacao - b.pontuacao);
}

function demo() {
  console.log('=== Cifras de César e de Vigenère: demonstração ===\n');
  const frase = 'A chave está debaixo do tapete da porta dos fundos.';
  const cifradaCesar = cesar(frase, 3);
  console.log(`Texto original        : ${frase}`);
  console.log(`César, deslocamento 3 : ${cifradaCesar}`);
  console.log(`César, de volta (-3)  : ${cesar(cifradaCesar, -3)}`);
  const cifradaVigenere = vigenere(frase, 'limao');
  console.log(`Vigenère, chave limao : ${cifradaVigenere}`);
  console.log(`Vigenère, decifrado   : ${vigenere(cifradaVigenere, 'limao', true)}`);
  console.log('Repare: acentos, espaços e pontuação atravessam a cifra sem mudar.\n');

  const segredo = 'Quem estuda um pouco todos os dias chega longe. A pressa atrapalha, mas a constância ensina mais do que qualquer talento.';
  const chaveReal = 7;
  const interceptado = cesar(segredo, chaveReal);
  console.log('Quebrando um César sem conhecer a chave:');
  console.log(`  interceptado: ${interceptado}`);
  const candidatos = quebrarCesar(interceptado);
  candidatos.slice(0, 3).forEach((candidato, i) => {
    console.log(`  ${i + 1}º lugar: deslocamento ${String(candidato.deslocamento).padStart(2)}, qui-quadrado ${candidato.pontuacao.toFixed(1).padStart(7)}`);
    console.log(`     ${candidato.texto}`);
  });
  const acertou = candidatos[0].deslocamento === chaveReal;
  console.log(`\n  Chave real: ${chaveReal}. ${acertou ? 'O quebrador acertou.' : 'O quebrador errou: texto curto demais.'}`);
}

function uso() {
  console.log(`Uso:
  node 15_cifra_cesar_vigenere.js cesar <deslocamento> "<texto>"
  node 15_cifra_cesar_vigenere.js decifrar-cesar <deslocamento> "<texto>"
  node 15_cifra_cesar_vigenere.js vigenere <chave> "<texto>"
  node 15_cifra_cesar_vigenere.js decifrar-vigenere <chave> "<texto>"
  node 15_cifra_cesar_vigenere.js quebrar "<texto cifrado com César>"
  node 15_cifra_cesar_vigenere.js --demo

Exemplos:
  node 15_cifra_cesar_vigenere.js cesar 3 "Olá, mundo!"
  node 15_cifra_cesar_vigenere.js vigenere limao "Texto secreto"`);
}

/** Junta os argumentos restantes em um texto só, aceitando texto sem aspas. */
function juntarTexto(partes) {
  const texto = partes.join(' ');
  if (texto.trim().length === 0) throw new Error('faltou o texto');
  return texto;
}

function main(args) {
  if (args.length === 0) {
    uso();
    return 0;
  }
  if (args.includes('--demo')) {
    demo();
    return 0;
  }
  const [comando, ...resto] = args;
  try {
    if (comando === 'cesar' || comando === 'decifrar-cesar') {
      const [deslocamentoTexto, ...partes] = resto;
      const deslocamento = Number(deslocamentoTexto);
      if (!Number.isInteger(deslocamento)) throw new Error(`o deslocamento precisa ser um inteiro, não "${deslocamentoTexto ?? ''}"`);
      console.log(cesar(juntarTexto(partes), comando === 'cesar' ? deslocamento : -deslocamento));
    } else if (comando === 'vigenere' || comando === 'decifrar-vigenere') {
      const [chave, ...partes] = resto;
      if (!chave) throw new Error('informe a chave e depois o texto');
      console.log(vigenere(juntarTexto(partes), chave, comando === 'decifrar-vigenere'));
    } else if (comando === 'quebrar') {
      const candidatos = quebrarCesar(juntarTexto(resto));
      console.log('Três candidatos mais prováveis:');
      candidatos.slice(0, 3).forEach((c) => console.log(`  deslocamento ${String(c.deslocamento).padStart(2)}: ${c.texto}`));
    } else {
      throw new Error(`comando desconhecido: "${comando}"`);
    }
    return 0;
  } catch (err) {
    console.error(`Erro: ${err.message}. Rode sem argumentos para ver o uso.`);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { cesar, vigenere, quebrarCesar, quiQuadrado };

/* ------------------------------------------------------------
 * Para ir além
 *  1. Remova os acentos antes de cifrar (normalize('NFD')), para que
 *     "está" não entregue uma pista a quem tenta quebrar a mensagem.
 *  2. Mostre a tabela de frequência do texto cifrado ao lado da do
 *     português: a letra mais comum costuma ser o "a" ou o "e" deslocados.
 *  3. Quebre também a Vigenère: descubra o tamanho da chave pelo índice de
 *     coincidência e trate cada posição da chave como um César separado.
 * ------------------------------------------------------------ */
